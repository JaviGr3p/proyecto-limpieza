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

/**
 * CalidadSoftware.jsx
 * Página: Información, Evaluador, Historial, Gráficas, Enlaces a norma y video.
 *
 * Requiere:
 * - public/evaluacion/ejemplo_metricas.json (o usar el form para ingresar)
 * - chart.js + react-chartjs-2 + dayjs
 *
 * Guardado de historial: localStorage key "qc_history"
 */

const DEFAULT_METRICS = {
  funcionalidad: 90,
  fiabilidad: 85,
  usabilidad: 95,
  eficiencia: 80,
  mantenibilidad: 88,
  portabilidad: 90,
};

const DEFAULT_WEIGHTS = {
  funcionalidad: 0.30,
  fiabilidad: 0.20,
  usabilidad: 0.20,
  eficiencia: 0.15,
  mantenibilidad: 0.10,
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

  useEffect(() => {
    // cargar historial desde localStorage
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
    // guardar historial cuando cambie
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  }, [history]);

  const calculate = (m = metrics, w = weights) => {
    // score 0..100
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
    // añadir al historial con fecha
    const item = {
      id: Date.now(),
      date: new Date().toISOString(),
      metrics: { ...metrics },
      weights: { ...weights },
      result: r,
    };
    setHistory((h) => [item, ...h].slice(0, 50)); // mantener hasta 50 entradas
  };

  const handleMetricChange = (k, v) => {
    setMetrics({ ...metrics, [k]: Number(v) });
  };

  const handleWeightChange = (k, v) => {
    const parsed = Number(v);
    setWeights({ ...weights, [k]: parsed });
  };

  const exportResultJSON = () => {
    if (!result) return;
    const payload = {
      generated_at: new Date().toISOString(),
      metrics,
      weights,
      result,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `evaluacion_${dayjs().format("YYYYMMDD_HHmm")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Gráfico de barras para métricas
  const barData = {
    labels: Object.keys(metrics).map((k) => k.toUpperCase()),
    datasets: [
      {
        label: "Valor (%)",
        data: Object.values(metrics),
        backgroundColor: "rgba(54, 162, 235, 0.6)",
      },
    ],
  };

  // Gráfico de línea para historial (nota 0..5)
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
      <h1 className="text-3xl font-bold mb-3">Calidad de Software — Evaluador</h1>

      <section className="mb-6 bg-white p-4 rounded shadow">
        <h2 className="text-xl font-semibold mb-2">Información</h2>
        <p className="text-sm mb-2">
          Este módulo aplica un modelo basado en <strong>ISO/IEC 25010</strong> para evaluar
          la calidad de software en métricas cuantitativas. Puedes cargar el ejemplo,
          editar los valores y pesos, y guardar el resultado en el historial.
        </p>

        <p className="text-sm">
          Resumen de la norma y documento de referencia: consulta el PDF subido:{" "}
          <a href="/docs/incluircalidad.pdf" target="_blank" rel="noreferrer" className="text-blue-600 underline">
            incluircalidad.pdf. </a>
        </p>

        <p className="mt-2 text-sm">
          Enlace directo a ISO/IEC 25010 (documentación oficial):{" "}
          <a
            href="https://www.iso.org/standard/35733.html"
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 underline"
          >
            ISO/IEC 25010
          </a>
        </p>
      </section>

      <section className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Evaluador */}
        <div className="bg-white p-4 rounded shadow">
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
                  <label className="block text-sm">{k.toUpperCase()} peso (0.00-1.00)</label>
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
              <p className="text-xs text-gray-500">Los pesos deben sumar 1.00 (suma actual: {Object.values(weights).reduce((a,b)=>a+b,0).toFixed(2)})</p>
            </div>
          </details>

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleCalculateClick}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Calcular y Guardar
            </button>

            <button
              onClick={handleLoadExample}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? "Cargando..." : "Cargar ejemplo"}
            </button>

            <button
              onClick={exportResultJSON}
              className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-900"
              disabled={!result}
            >
              Exportar JSON
            </button>
          </div>

          {error && <div className="mt-2 text-red-600">{error}</div>}
        </div>

        {/* Gráficos y resultado */}
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-lg font-semibold mb-2">Resultados y gráficos</h3>

          {result ? (
            <>
              <div className="mb-2">
                <strong>Score (0–100):</strong> {result.score100}
              </div>
              <div className="mb-2">
                <strong>Nota (0–5):</strong> {result.score5}
              </div>
              <div className="mb-4">
                <Bar data={barData} />
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-600">Aún no se ha calculado una evaluación. Usa "Cargar ejemplo" o ingresa valores y pulsa "Calcular y Guardar".</p>
          )}

          <div className="mt-3">
            <button
              onClick={() => setShowVideo((s) => !s)}
              className="text-sm text-blue-600 underline"
            >
              {showVideo ? "Ocultar video explicativo" : "Mostrar video explicativo"}
            </button>
            {showVideo && (
              <div className="mt-2">
                {/* Recomendado: subir video a YouTube y pegar la URL */}
                <iframe
                  title="Video explicativo"
                  width="100%"
                  height="250"
                  src="https://www.youtube.com/embed/VIDEO_ID"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
                <p className="text-xs text-gray-500 mt-1">Si tu video está en Drive, súbelo a YouTube (opción no listada) para facilitar el embed.</p>
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
                    <th className="text-left p-2">Nota (0–5)</th>
                    <th className="text-left p-2">Score (0–100)</th>
                    <th className="text-left p-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id} className="border-t">
                      <td className="p-2">{dayjs(h.date).format("DD/MM/YYYY HH:mm")}</td>
                      <td className="p-2">{h.result.score5}</td>
                      <td className="p-2">{h.result.score100}</td>
                      <td className="p-2">
                        <button
                          onClick={() => {
                            // cargar en formulario para editar/revisar
                            setMetrics(h.metrics);
                            setWeights(h.weights);
                            setResult(h.result);
                          }}
                          className="text-blue-600 underline mr-2"
                        >
                          Cargar
                        </button>
                        <button
                          onClick={() => {
                            setHistory((cur) => cur.filter((x) => x.id !== h.id));
                          }}
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

            {/* Gráfico de evolución */}
            <div className="mt-4">
              <Line data={lineData} />
            </div>
          </>
        )}
      </section>

      {/* Conclusiones y recomendaciones (plantilla) */}
      <section className="mb-6 bg-white p-4 rounded shadow">
        <h3 className="text-lg font-semibold mb-2">Conclusiones y recomendaciones</h3>
        <p className="text-sm mb-2">
          Aquí puedes escribir las conclusiones y recomendaciones basadas en los resultados.
          Ejemplo: "La aplicación obtuvo una calificación de X/5. Recomendamos mejorar las pruebas de carga y reforzar la seguridad en endpoints críticos."
        </p>

        <a
          href="/docs/incluircalidad.pdf"
          target="_blank"
          rel="noreferrer"
          className="text-blue-600 underline"
        >
          Descargar documento de referencia (incluircalidad.pdf). </a>
      </section>
    </div>
  );
}
