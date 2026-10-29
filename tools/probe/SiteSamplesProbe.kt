package ru.kost.ruvoice

import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assume.assumeTrue
import org.junit.Test
import ru.kost.ruvoice.text.Emoji
import ru.kost.ruvoice.text.English
import ru.kost.ruvoice.text.HardE
import ru.kost.ruvoice.text.Layers
import ru.kost.ruvoice.text.Marks
import ru.kost.ruvoice.text.Morph
import ru.kost.ruvoice.text.Normalizer
import ru.kost.ruvoice.text.Rules
import ru.kost.ruvoice.text.SentenceType
import ru.kost.ruvoice.text.Stress
import ru.kost.ruvoice.text.StressModels
import ru.kost.ruvoice.text.SymbolNames
import ru.kost.ruvoice.text.YoDict
import java.io.File

/**
 * Зонд сайта RuVoice (ruvoice-tts.github.io): текст образцов через настоящий конвейер приложения.
 * Живёт в репозитории сайта (tools/probe), сюда копируется на время запуска tools/run_probe.sh и удаляется.
 * Куски — Pipeline.plan, подготовка куска — как SileroTtsService.synthSegment (вопрос и восклицание, Marks.parse,
 * layer.prepare, ударения, stretchShort, начало по основе голоса, forModel, typeIds, align, паузы знаков).
 * Настройки — как у свежей установки: паузы запятой 100 мс, тире 150 мс, предложения 0, абзаца 300.
 */
class SiteSamplesProbe {
    private val root = TestData.root()
    private val d = TestData.data()
    private fun asset(p: String) = File(root, "app/src/main/assets/$p")

    /** Акцентор и омографы — настоящие модели через python-процесс (site/tools/stress_server.py). */
    private class PyStress(py: String, server: String, private val pad: Int) : StressModels, AutoCloseable {
        private val p = ProcessBuilder(py, server).redirectError(ProcessBuilder.Redirect.INHERIT).start()
        private val w = p.outputStream.bufferedWriter()
        private val r = p.inputStream.bufferedReader()
        private fun call(o: JSONObject): JSONObject {
            w.write(o.toString()); w.newLine(); w.flush()
            return JSONObject(r.readLine() ?: error("stress_server.py не ответил"))
        }
        private fun rows(a: JSONArray) = Array(a.length()) { i ->
            a.getJSONArray(i).let { row -> FloatArray(row.length()) { row.getDouble(it).toFloat() } }
        }
        override fun accentor(words: List<String>): Pair<Array<FloatArray>, Array<FloatArray>> {
            val o = call(JSONObject().put("op", "accentor").put("words", JSONArray(words)))
            return rows(o.getJSONArray("stress")) to rows(o.getJSONArray("yo"))
        }
        override fun homo(ids: List<LongArray>, starts: LongArray, ends: LongArray): FloatArray {
            if (ids.isEmpty()) return FloatArray(0)
            val o = call(JSONObject().put("op", "homo").put("ids", JSONArray(ids.map { JSONArray(it.toList()) }))
                .put("starts", JSONArray(starts.toList())).put("ends", JSONArray(ends.toList())).put("pad", pad))
            val a = o.getJSONArray("probs")
            return FloatArray(a.length()) { a.getDouble(it).toFloat() }
        }
        override fun close() { w.close(); p.waitFor() }
    }

    @Test fun probe() {
        val inPath = System.getenv("SITE_PROBE_IN")
        val outPath = System.getenv("SITE_PROBE_OUT")
        assumeTrue("зонд сайта запускается только из tools/run_probe.sh", inPath != null && outPath != null)
        // общие таблицы — как в RuPathSnapshotTest и SileroModels.data()
        Normalizer.morph = Morph.open(asset("morph.bin"))
        YoDict.shared = asset("eyo_safe.txt").bufferedReader().useLines { YoDict(it) }
        HardE.shared = HardE(asset("hard_e.txt").readLines())
        Emoji.shared = asset("emoji_ru.tsv").bufferedReader().useLines { Emoji(it) }
        SymbolNames.cldr = asset("symbols_ru.tsv").bufferedReader().useLines { SymbolNames.parse(it) }
        val stressFiles = listOf(asset("dicts/stress/Системный.txt"))
        val stressDict = DictCache.stress(stressFiles)
        val replacements = DictCache.replacements(listOf(asset("dicts/replace/Системный.txt")), stress = stressFiles)
        val layer = Layers.of("ru")
        val sym = d.sym
        val questions = layer.questions(d)
        val inputs = JSONArray(File(inPath!!).readText())
        val out = JSONArray()
        PyStress(System.getenv("SITE_STRESS_PY"), System.getenv("SITE_STRESS_SERVER"), d.bertPad).use { models ->
            for (k in 0 until inputs.length()) {
                val inp = inputs.getJSONObject(k)
                val screenReader = inp.optString("mode", "books") == "screen_reader"
                val base = Rules()
                val rules = if (screenReader) base.screenReader() else base
                val noPauses = screenReader && base.on("sr_pauses_off")
                val stress = Stress(d, models, stressDict, rules, layer = layer)
                val pauseFrames = HashMap<Int, Long>()
                fun pause(ms: Int, vararg chars: Char) { if (ms > 0) for (c in chars) sym.symbolToId[c]?.let { pauseFrames[it] = Marks.frames(ms) } }
                pause(100, ',', *(if (rules.on("pause_semicolon")) charArrayOf(';', ':') else charArrayOf()))
                pause(150, '–', '—')
                val plan = Pipeline.plan(inp.getString("text"), d, 0, if (noPauses) 0 else 300, replacements, rules, 0,
                    maxOf(100, English.JOIN_MS), layer, sym.allowed)
                val segs = JSONArray()
                for (seg in plan) {
                    val prepared = if (seg.text.isBlank()) null else {
                        var text = if (rules.on("exclaim")) Marks.exclaim(seg.text) else seg.text
                        if (rules.on("question") && SentenceType.classify(text, questions, rules) == "general_q") text = Marks.question(text, verb = questions::verb)
                        val marks = Marks.parse(text, rules.focusLevel)
                        val prep = layer.prepare(marks.text, sym.allowed, rules)
                        if (prep.none { it != '+' && it in sym.alphabet }) null else Triple(marks, prep, text)
                    }
                    if (prepared == null) {
                        // кусок без звука — только пауза: прибавляем её к предыдущему
                        if (segs.length() > 0) segs.getJSONObject(segs.length() - 1).let { it.put("pauseAfterMs", it.getInt("pauseAfterMs") + seg.breakMs) }
                        continue
                    }
                    val (marks, prep, _) = prepared
                    val (accented, endDot) = stress.modelEnd(stress.apply(prep, marks.text))
                    val spoken = stress.stretchShort(accented).let {
                        when (inp.getString("base")) { "aidar" -> stress.yaOnset(it); "kseniya", "eugene" -> stress.clusterOnset(it); else -> it }
                    }
                    val forModel = stress.forModel(spoken)
                    val seq = sym.sequence(forModel)
                    val sentenceType = SentenceType.classify(marks.text, questions, rules)
                    val typeIds = SentenceType.typeIds(prep, sentenceType, seq.size, d)
                    val al = Marks.align(marks.words, spoken, seq.size, sym)
                    val symbDurs = (2 until seq.size).mapNotNull { i ->
                        val fr = pauseFrames[seq[i].toInt()] ?: return@mapNotNull null
                        if (spoken[i - 1] in "–—" && spoken.substring(0, i - 1).trimEnd().lastOrNull()?.let { it in Marks.PUNCT } == true) null else i.toLong() to fr
                    }.toMap() + (if (endDot) mapOf((seq.size - 2).toLong() to 1L) else emptyMap()) + al.symbDurs
                    segs.put(JSONObject()
                        .put("display", forModel.replace("+", "").trim())
                        .put("model", forModel)
                        .put("seq", JSONArray(seq.toList()))
                        .put("typeIds", JSONArray(typeIds.toList()))
                        .put("rates", JSONArray(al.rates.map { it.toDouble() }))
                        .put("pitches", JSONArray(al.pitches.map { it.toDouble() }))
                        .put("focus", JSONArray(al.focus.toList()))
                        .put("symbDurs", JSONObject(symbDurs.entries.associate { it.key.toString() to it.value }))
                        .put("pauseAfterMs", seg.breakMs))
                }
                out.put(JSONObject().put("key", inp.getString("key")).put("segments", segs))
            }
        }
        File(outPath!!).writeText(out.toString())
        // строки из таблицы README: если конвейер читает иначе, образцы на сайте врали бы
        val display = (0 until out.length()).associate { i ->
            val o = out.getJSONObject(i)
            val segs = o.getJSONArray("segments")
            o.getString("key") to (0 until segs.length()).joinToString(" ") { segs.getJSONObject(it).getString("display") }.trim()
        }
        if ("reads/time" in display) assertEquals("в двадцать один час тридцать минут", display["reads/time"])
        if ("reads/tsar" in display) assertEquals("николай второй", display["reads/tsar"])
        if ("reads/money" in display) assertEquals("около пятисот рублей", display["reads/money"])
    }
}
