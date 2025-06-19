const https = require("https")
const fs = require("fs")
const path = require("path")

class LLMChat {
  constructor() {
    this.config = this.loadConfig()
  }

  loadConfig() {
    const configPath = path.join(__dirname, "config.json")
    try {
      if (fs.existsSync(configPath)) {
        return JSON.parse(fs.readFileSync(configPath, "utf8"))
      }
    } catch (error) {
      console.error("Error loading config:", error.message)
    }

    // Default configuration
    return {
      provider: "openai",
      model: "gpt-3.5-turbo",
      apiKey: process.env.OPENAI_API_KEY || "",
      maxTokens: 1000,
      temperature: 0.7,
    }
  }

  async chatWithOpenAI(messages) {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify({
        model: this.config.model,
        messages: messages,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
      })

      const options = {
        hostname: "api.openai.com",
        port: 443,
        path: "/v1/chat/completions",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Length": data.length,
        },
      }

      const req = https.request(options, (res) => {
        let responseData = ""

        res.on("data", (chunk) => {
          responseData += chunk
        })

        res.on("end", () => {
          try {
            const parsed = JSON.parse(responseData)
            if (parsed.error) {
              reject(new Error(parsed.error.message))
            } else {
              resolve(parsed.choices[0].message.content)
            }
          } catch (error) {
            reject(new Error("Failed to parse response"))
          }
        })
      })

      req.on("error", (error) => {
        reject(error)
      })

      req.write(data)
      req.end()
    })
  }

  async chatWithGroq(messages) {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify({
        model: this.config.model || "mixtral-8x7b-32768",
        messages: messages,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
      })

      const options = {
        hostname: "api.groq.com",
        port: 443,
        path: "/openai/v1/chat/completions",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Length": data.length,
        },
      }

      const req = https.request(options, (res) => {
        let responseData = ""

        res.on("data", (chunk) => {
          responseData += chunk
        })

        res.on("end", () => {
          try {
            const parsed = JSON.parse(responseData)
            if (parsed.error) {
              reject(new Error(parsed.error.message))
            } else {
              resolve(parsed.choices[0].message.content)
            }
          } catch (error) {
            reject(new Error("Failed to parse response"))
          }
        })
      })

      req.on("error", (error) => {
        reject(error)
      })

      req.write(data)
      req.end()
    })
  }

  async processQuery(inputData) {
    try {
      const { query, context, file_path, file_syntax } = inputData

      // Build the messages array
      const messages = [
        {
          role: "system",
          content: `You are a helpful coding assistant integrated into Sublime Text. 
                    Current file: ${file_path || "Unknown"}
                    File type: ${file_syntax || "Unknown"}
                    Provide clear, concise, and helpful responses. Format code examples with proper markdown.`,
        },
      ]

      // Add context if provided
      if (context && context.trim()) {
        messages.push({
          role: "user",
          content: `Here's some context from my current file:\n\n\`\`\`${file_syntax}\n${context}\n\`\`\``,
        })
      }

      // Add the main query
      messages.push({
        role: "user",
        content: query,
      })

      let response
      if (this.config.provider === "groq") {
        response = await this.chatWithGroq(messages)
      } else {
        response = await this.chatWithOpenAI(messages)
      }

      return {
        query: query,
        response: response,
        timestamp: new Date().toISOString(),
        provider: this.config.provider,
        model: this.config.model,
      }
    } catch (error) {
      throw new Error(`LLM API Error: ${error.message}`)
    }
  }
}

// Main execution
async function main() {
  try {
    // Read input from stdin
    let inputData = ""

    process.stdin.on("data", (chunk) => {
      inputData += chunk
    })

    process.stdin.on("end", async () => {
      try {
        const input = JSON.parse(inputData)
        const llmChat = new LLMChat()
        const result = await llmChat.processQuery(input)
        console.log(JSON.stringify(result))
      } catch (error) {
        console.error(JSON.stringify({ error: error.message }))
        process.exit(1)
      }
    })
  } catch (error) {
    console.error(JSON.stringify({ error: error.message }))
    process.exit(1)
  }
}

main()
