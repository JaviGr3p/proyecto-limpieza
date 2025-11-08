import json
import sys

def calcular_score(metrics):
    pesos = {
        "funcionalidad": 0.3,
        "fiabilidad": 0.2,
        "usabilidad": 0.2,
        "eficiencia": 0.15,
        "mantenibilidad": 0.1,
        "portabilidad": 0.05
    }

    score100 = sum(metrics[k] * pesos.get(k, 0) for k in metrics)
    score5 = round(score100 / 20, 2)
    return score100, score5

def main():
    if len(sys.argv) > 1:
        with open(sys.argv[1]) as f:
            metrics = json.load(f)
    else:
        metrics = {}
        print("Ingrese las métricas (0–100):")
        for key in ["funcionalidad", "fiabilidad", "usabilidad", "eficiencia", "mantenibilidad", "portabilidad"]:
            val = input(f"{key.capitalize()}: ") or "80"
            metrics[key] = float(val)

    score100, score5 = calcular_score(metrics)

    result = {
        "metrics": metrics,
        "score100": score100,
        "score5": score5
    }

    print("\n=== RESULTADO DE EVALUACIÓN ===")
    print(json.dumps(result, indent=2))
    with open("evaluacion_result.json", "w") as f:
        json.dump(result, f, indent=2)
    print("\nArchivo 'evaluacion_result.json' generado con éxito.")

if __name__ == "__main__":
    main()
