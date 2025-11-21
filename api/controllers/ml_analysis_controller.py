from database import get_db
from fastapi import APIRouter, Depends, HTTPException
from schemas.ml_analysis import MLAnalysisRequest, MLAnalysisResponse
from services.ml_analysis_service import MLAnalysisService
from sqlalchemy.orm import Session

router = APIRouter(tags=["ml-analysis"])


@router.post("/ml/analyze", response_model=MLAnalysisResponse)
def analyze_data(
    request: MLAnalysisRequest,
    db: Session = Depends(get_db),
):
    """
    Realiza análise de Machine Learning nos dados de sensores.

    Tipos de análise disponíveis:
    - clustering: Agrupa dados em clusters similares
    - prediction: Prediz valores futuros
    - classification: Classifica dados em categorias (baixo/normal/alto)

    Campos disponíveis:
    - temperature: Temperatura
    - rssi: Sinal RSSI (se disponível)
    - vazao: Vazão/Fluxo
    """
    try:
        # Executar análise
        results = MLAnalysisService.perform_analysis(
            db=db,
            analysis_type=request.analysis_type.value,
            target_field=request.target_field.value,
            time_range=request.time_range,
        )

        # Verificar se houve erro
        if "error" in results:
            raise HTTPException(status_code=400, detail=results["error"])

        # Preparar resposta
        from datetime import datetime

        metadata = {
            "dataset": request.dataset,
            "timestamp": datetime.now().isoformat(),
        }

        return MLAnalysisResponse(
            analysis_type=request.analysis_type.value,
            target_field=request.target_field.value,
            time_range=request.time_range,
            results=results,
            metadata=metadata,
            message="Análise concluída com sucesso",
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao realizar análise: {str(e)}"
        )
