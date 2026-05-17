import { publicRuntimeStatus } from "@/lib/env"
import { okJson } from "@/lib/backend/http"

export const runtime = "nodejs"

export async function GET() {
  return okJson({
    ok: true,
    service: "sourcery-backend",
    workflow_alignment: [
      "problem_definition",
      "architecture_design",
      "knowledge_layer_rag",
      "model_integration",
      "agent_orchestration",
      "testing_validation",
      "deployment_readiness",
    ],
    runtime: publicRuntimeStatus(),
  })
}
