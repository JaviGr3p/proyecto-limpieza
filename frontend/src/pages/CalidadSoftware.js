import React, { useEffect, useState } from "react";
import { Bar, Line } from "react-chartjs-2";
import dayjs from "dayjs";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const DEFAULT_METRICS = {
  funcionalidad: 90,
  fiabilidad: 85,
  usabilidad: 95,
  eficiencia: 80,
  mantenibilidad: 88,
  portabilidad: 90,
};

const DEFAULT_WEIGHTS = {
  funcionalidad: 0.3,
  fiabilidad: 0.2,
  usabilidad: 0.2,
  eficiencia: 0.15,
  mantenibilidad: 0.1,
  portabilidad: 0.05,
};

const STORAGE_KEY = "qc_history_v1";

export default function CalidadSoftware() {
  const [metrics, setMetrics] = useState(DEFAULT_METRICS);
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);
  const [showVideo, setShowVideo] = useState(false);
  const [recommendation, setRecommendation] = useState("");


  // 🔹 Nuevos campos
  const [evaluator, setEvaluator] = useState("");
  const [appName, setAppName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    const h = localStorage.getItem(STORAGE_KEY);
    if (h) {
      try {
        setHistory(JSON.parse(h));
      } catch (e) {
        console.warn("No se pudo parsear historial:", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  }, [history]);

  const calculate = (m = metrics, w = weights) => {
    let score100 = 0;
    Object.keys(m).forEach((k) => {
      const val = Number(m[k]) || 0;
      const wk = Number(w[k]) || 0;
      score100 += val * wk;
    });
    const score5 = Math.round((score100 / 100) * 5 * 100) / 100;
    return { score100: Math.round(score100 * 100) / 100, score5 };
  };

  const handleLoadExample = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/evaluacion/ejemplo_metricas.json");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMetrics((prev) => ({ ...prev, ...data }));
      const r = calculate({ ...metrics, ...data }, weights);
      setResult(r);
    } catch (err) {
      console.error("Error cargando ejemplo:", err);
      setError("No se pudo cargar el archivo de ejemplo. Revisa la ruta en public/evaluacion/ejemplo_metricas.json");
    } finally {
      setLoading(false);
    }
  };

  const handleCalculateClick = () => {
  const r = calculate(metrics, weights);
  setResult(r);

  // 🔹 Encuentra la métrica más baja
  const entries = Object.entries(metrics);
  const lowest = entries.reduce((a, b) => (a[1] < b[1] ? a : b));
  const lowestMetric = lowest[0];
  const lowestValue = lowest[1];

  // 🔹 Determinar texto de recomendación
  let qualityText = "";
  if (r.score5 >= 4.5) qualityText = "Excelente calidad";
  else if (r.score5 >= 3.5) qualityText = "Buena calidad";
  else if (r.score5 >= 2.5) qualityText = "Calidad aceptable";
  else qualityText = "Debe mejorarse significativamente";

  const recText = `Se recomienda mejorar la ${lowestMetric} (${lowestValue}%) para aumentar la calidad del software.`;

  // 🔹 Mostrar recomendación
  setRecommendation({
    message: recText,
    level: qualityText,
    metric: lowestMetric,
    value: lowestValue,
  });

  // 🔹 Guardar en historial
  const item = {
    id: Date.now(),
    date: new Date().toISOString(),
    evaluator,
    appName,
    description,
    metrics: { ...metrics },
    weights: { ...weights },
    result: r,
    recommendation: {
      message: recText,
      level: qualityText,
      metric: lowestMetric,
      value: lowestValue,
    },
  };
  setHistory((h) => [item, ...h].slice(0, 50));
};

// 🔹 Exportar resultado como JSON
  const exportResultJSON = () => {
    if (!result) return;
    const payload = {
      generated_at: new Date().toISOString(),
      evaluator,
      appName,
      description,
      metrics,
      weights,
      result,
      recommendation,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `evaluacion_${dayjs().format("YYYYMMDD_HHmm")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
// 🔹 Cambiar valor de una métrica individual
const handleMetricChange = (key, value) => {
  const val = Math.max(0, Math.min(100, Number(value))); // limitar entre 0 y 100
  setMetrics((prev) => ({ ...prev, [key]: val }));
};

// 🔹 Cambiar peso de una métrica
const handleWeightChange = (key, value) => {
  const val = Math.max(0, Math.min(1, Number(value))); // limitar entre 0 y 1
  setWeights((prev) => ({ ...prev, [key]: val }));
};

// 🔹 Datos para los gráficos
const barData = {
  labels: Object.keys(metrics).map((k) => k.toUpperCase()),
  datasets: [
    {
      label: appName ? `Métricas — ${appName}` : "Métricas (%)",
      data: Object.values(metrics),
      backgroundColor: "rgba(54, 162, 235, 0.6)",
    },
  ],
};

const lineData = {
  labels: history.map((h) => dayjs(h.date).format("DD/MM HH:mm")),
  datasets: [
    {
      label: "Nota (0–5)",
      data: history.map((h) => h.result.score5),
      borderColor: "rgba(75,192,192,1)",
      fill: false,
    },
  ],
};

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-3 text-center">
          Calidad de Software — Evaluador
      </h1>

      {/* Información general */}
      <section className="mb-6 bg-white p-4 rounded shadow">
        <h2 className="text-xl font-semibold mb-2">Información</h2>
        <p className="text-sm mb-2">
          Este módulo aplica un modelo basado en <strong>ISO/IEC 25010</strong> para evaluar
          la calidad de software en métricas cuantitativas. Puedes cargar el ejemplo,
          editar los valores y pesos, y guardar el resultado en el historial.
        </p>

        <p className="text-sm mt-2">
          Basado en la norma <strong>ISO/IEC 25010:2011</strong> —{" "}
          <em>Systems and software engineering — Systems and software Quality Requirements and Evaluation (SQuaRE)</em>.
          Aunque esta versión fue retirada, se usa con fines académicos.
          Reemplazada por{" "}
          <a
            href="https://www.iso.org/standard/78176.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            ISO/IEC 25010:2023
          </a>.
        </p>

        <p className="text-sm mt-2">
          Consulta el resumen educativo de los pilares y características de calidad en el documento local:{" "}
          <a
            href="/docs/incluircalidad.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            incluircalidad.pdf
          </a>
        </p>
      </section>

      {/* Formulario principal */}
      <section className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-lg font-semibold mb-2">Datos del Evaluador y Aplicación</h3>

          <div className="mb-2">
            <label className="block text-sm font-medium">Nombre del Evaluador</label>
            <input
              type="text"
              value={evaluator}
              onChange={(e) => setEvaluator(e.target.value)}
              className="w-full border rounded px-2 py-1"
              placeholder="Ej: Wilber Vides"
            />
          </div>

          <div className="mb-2">
            <label className="block text-sm font-medium">Nombre de la Aplicación Evaluada</label>
            <input
              type="text"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              className="w-full border rounded px-2 py-1"
              placeholder="Ej: Sistema de Limpieza CleanPro"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium">Descripción o contexto</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border rounded px-2 py-1"
              rows="2"
              placeholder="Ej: Evaluación de la calidad de software desarrollada en entorno educativo."
            />
          </div>

          <h3 className="text-lg font-semibold mb-2">Evaluador (ingresa % para cada criterio)</h3>
          {Object.keys(metrics).map((k) => (
            <div key={k} className="mb-2">
              <label className="block text-sm font-medium">{k.toUpperCase()}</label>
              <input
                type="number"
                min="0"
                max="100"
                value={metrics[k]}
                onChange={(e) => handleMetricChange(k, e.target.value)}
                className="w-full border rounded px-2 py-1"
              />
              <div className="text-xs text-gray-500">Peso: {(weights[k] * 100).toFixed(0)}%</div>
            </div>
          ))}

          <details className="mt-2">
            <summary className="cursor-pointer text-sm text-blue-600">Editar pesos (opcional)</summary>
            <div className="mt-2">
              {Object.keys(weights).map((k) => (
                <div key={k} className="mb-2">
                  <label className="block text-sm">{k.toUpperCase()} peso (0.00–1.00)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={weights[k]}
                    onChange={(e) => handleWeightChange(k, e.target.value)}
                    className="w-28 border rounded px-2 py-1"
                  />
                </div>
              ))}
              <p className="text-xs text-gray-500">
                Los pesos deben sumar 1.00 (actual: {Object.values(weights).reduce((a, b) => a + b, 0).toFixed(2)})
              </p>
            </div>
          </details>

          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={handleCalculateClick} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
              Calcular y Guardar
            </button>
            <button onClick={handleLoadExample} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700" disabled={loading}>
              {loading ? "Cargando..." : "Cargar ejemplo"}
            </button>
            <button onClick={exportResultJSON} className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-900" disabled={!result}>
              Exportar JSON
            </button>
          </div>
          {error && <div className="mt-2 text-red-600">{error}</div>}
        </div>

        {/* Resultados y video */}
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-lg font-semibold mb-2">Resultados y gráficos</h3>

          {result ? (
            <>
              <div className="mb-2"><strong>Evaluador:</strong> {evaluator || "—"}</div>
              <div className="mb-2"><strong>Aplicación:</strong> {appName || "—"}</div>
              <div className="mb-2"><strong>Score (0–100):</strong> {result.score100}</div>
              <div className="mb-2"><strong>Nota (0–5):</strong> {result.score5}</div>
              <div className="mb-4"><Bar data={barData} /></div>

              {recommendation && (
  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
    <p className="text-sm mb-1">
      <strong>{appName || "La aplicación evaluada"}</strong> obtuvo una calificación promedio de{" "}
      <strong>{result.score5} / 5.00</strong>
    </p>
    <p className="text-sm mb-1">⭐ {recommendation.level}</p>
    <p className="text-sm text-gray-700">{recommendation.message}</p>
  </div>
)}
            </>
          ) : (
            <p className="text-sm text-gray-600">
              Aún no se ha calculado una evaluación. Usa "Cargar ejemplo" o ingresa valores y pulsa "Calcular y Guardar".
            </p>
          )}

          {/* 🔹 Video explicativo */}
          <div className="mt-3">
            <button onClick={() => setShowVideo(!showVideo)} className="text-sm text-blue-600 underline">
              {showVideo ? "Ocultar video explicativo" : "Mostrar video explicativo"}
            </button>
            {showVideo && (
              <div className="mt-2">
                <iframe
                  title="Video explicativo"
                  width="100%"
                  height="250"
                  src="https://www.youtube.com/embed/VIDEO_ID"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
                <p className="text-xs text-gray-500 mt-1">
                  Sube tu video a YouTube (no listado) y reemplaza <code>VIDEO_ID</code> con el ID del video.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Historial */}
      <section className="mb-6 bg-white p-4 rounded shadow">
        <h3 className="text-lg font-semibold mb-2">Historial de evaluaciones</h3>
        {history.length === 0 ? (
          <p className="text-sm text-gray-500">No hay evaluaciones guardadas aún.</p>
        ) : (
          <>
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left p-2">Fecha</th>
                    <th className="text-left p-2">Evaluador</th>
                    <th className="text-left p-2">Aplicación</th>
                    <th className="text-left p-2">Nota (0–5)</th>
                    <th className="text-left p-2">Score</th>
                    <th className="text-left p-2">Recomendación</th>
                    <th className="text-left p-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id} className="border-t">
                      <td className="p-2">{dayjs(h.date).format("DD/MM/YYYY HH:mm")}</td>
                      <td className="p-2">{h.evaluator || "—"}</td>
                      <td className="p-2">{h.appName || "—"}</td>
                      <td className="p-2">{h.result.score5}</td>
                      <td className="p-2">{h.result.score100}</td>
                      <td className="p-2 text-gray-700">
                        {h.recommendation ? (
                          <>
                            <span className="block font-medium">{h.recommendation.level}</span>
                            <span className="text-xs text-gray-500">
                              Mejorar {h.recommendation.metric} ({h.recommendation.value}%)
                            </span>
                          </>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>

                      <td className="p-2">
                        <button
                          onClick={() => {
                            setEvaluator(h.evaluator || "");
                            setAppName(h.appName || "");
                            setDescription(h.description || "");
                            setMetrics(h.metrics);
                            setWeights(h.weights);
                            setResult(h.result);
                          }}
                          className="text-blue-600 underline mr-2"
                        >
                          Cargar
                        </button>
                        <button
                          onClick={() => setHistory((cur) => cur.filter((x) => x.id !== h.id))}
                          className="text-red-600 underline"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4">
              <Line data={lineData} />
            </div>
          </>
        )}
      </section>
    </div>
  );
}
