// Relationship view - derives an asset's dependency edges (its blast radius)
// from metadata already collected: the service account it runs as, the external
// services its env-var names imply, and the model it serves. Pure function, no
// new discovery.
//
// ponytail: edges are inferred from env-var *names* + identity, not from real
// IAM bindings or Secret Manager references. Upgrade path: collect those in
// discovery and add edge kinds here - the render does not change.
import type { Asset } from "@/lib/types";

export interface Edge {
  relation: string; // "Runs as", "Calls", "Reads", "Serves"
  target: string;
  kind: "identity" | "llm" | "vertex" | "vectorstore" | "model";
}

// Env-var name -> external dependency. First match wins.
const PROVIDERS: [RegExp, string][] = [
  [/OPENAI/i, "OpenAI"],
  [/ANTHROPIC|CLAUDE/i, "Anthropic"],
  [/COHERE/i, "Cohere"],
  [/MISTRAL/i, "Mistral"],
  [/GROQ/i, "Groq"],
  [/PERPLEXITY/i, "Perplexity"],
  [/TOGETHER/i, "Together AI"],
  [/REPLICATE/i, "Replicate"],
  [/HUGGINGFACE|HF_TOKEN/i, "Hugging Face"],
];
const GOOGLE_AI = /GEMINI|VERTEX|GOOGLE_API_KEY/i;
const VECTOR = /VECTOR_DB|PINECONE|WEAVIATE|QDRANT|CHROMA|MILVUS/i;

export function relationships(asset: Asset): Edge[] {
  const edges: Edge[] = [];

  if (asset.serviceAccount) {
    edges.push({ relation: "Runs as", target: asset.serviceAccount, kind: "identity" });
  }

  const seen = new Set<string>();
  const add = (relation: string, target: string, kind: Edge["kind"]) => {
    if (seen.has(kind + target)) return;
    seen.add(kind + target);
    edges.push({ relation, target, kind });
  };

  for (const key of Object.keys(asset.environmentVariables ?? {})) {
    const provider = PROVIDERS.find(([re]) => re.test(key));
    if (provider) add("Calls", provider[1], "llm");
    else if (GOOGLE_AI.test(key)) add("Calls", "Vertex AI", "vertex");
    else if (VECTOR.test(key)) add("Reads", "Vector store", "vectorstore");
  }

  // A Vertex AI endpoint serves the deployed model named in its runtime.
  if (asset.type === "VERTEX_AI" && asset.runtime) {
    add("Serves", asset.runtime, "model");
  }

  return edges;
}
