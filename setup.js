const fs = require("fs")
const path = require("path")
const readline = require("readline")

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

async function setup() {
  console.log("🚀 Setting up Sublime LLM Chat Package\n")

  const config = {
    provider: "openai",
    model: "gpt-3.5-turbo",
    apiKey: "",
    maxTokens: 1000,
    temperature: 0.7,
  }

  // Ask for provider
  const provider = await askQuestion("Choose provider (openai/groq) [openai]: ")
  config.provider = provider.toLowerCase() || "openai"

  // Ask for API key
  const apiKey = await askQuestion(`Enter your ${config.provider.toUpperCase()} API key: `)
  config.apiKey = apiKey

  // Ask for model
  if (config.provider === "openai") {
    const model = await askQuestion("Model (gpt-3.5-turbo/gpt-4) [gpt-3.5-turbo]: ")
    config.model = model || "gpt-3.5-turbo"
  } else if (config.provider === "groq") {
    const model = await askQuestion("Model (mixtral-8x7b-32768/llama2-70b-4096) [mixtral-8x7b-32768]: ")
    config.model = model || "mixtral-8x7b-32768"
  }

  // Save configuration
  const configPath = path.join(__dirname, "config.json")
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2))

  console.log("\n✅ Configuration saved successfully!")
  console.log("\nUsage:")
  console.log("- Press Ctrl+Shift+L to ask LLM")
  console.log("- Press Ctrl+Shift+E to explain selected code")
  console.log("- Right-click for context menu options")

  rl.close()
}

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim())
    })
  })
}

setup().catch(console.error)
