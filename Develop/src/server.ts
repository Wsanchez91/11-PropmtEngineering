import dotenv from 'dotenv';
import express from 'express';
import type { Request, Response } from 'express';
import { OpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";
import { StructuredOutputParser } from 'langchain/output_parsers';

dotenv.config();

const port = process.env.PORT || 3001;
const apiKey = process.env.OPENAI_API_KEY;

// Check if the API key is defined
if (!apiKey) {
  console.error('OPENAI_API_KEY is not defined. Exiting...');
  process.exit(1);
}

const app = express();
app.use(express.json());

// ✅ Initialize the OpenAI model
const model = new OpenAI({
  apiKey,
  modelName: "gpt-4",
  temperature: 0.7,
});

// ✅ Define the structured output schema using Zod
const forecastSchema = z.object({
  location: z.string(),
  temperature: z.string(),
  condition: z.string(),
});

// ✅ Define the parser for the structured output
const parser = StructuredOutputParser.fromZodSchema(forecastSchema);
const formatInstructions = parser.getFormatInstructions();

// ✅ Define the prompt template
const promptTemplate = new PromptTemplate({
  template: `Provide a weather forecast for the following location: {location}. 
  Follow this output format: 
  {format_instructions}`,
  inputVariables: ["location"],
  partialVariables: { format_instructions: formatInstructions },
});

// ✅ API route to handle weather forecast requests
app.post('/forecast', async (req: Request, res: Response) => {
    try {
        const { location } = req.body;
        if (!location) {
            return res.status(400).json({ error: "Location is required." });
        }

        // Create prompt input
        const prompt = await promptTemplate.format({ location });

        // Call OpenAI API
        const response = await model.invoke(prompt);
        
        return res.json({ forecast: response }); // ✅ Ensure the function always returns
    } catch (error) {
        console.error("Error generating forecast:", error);
        return res.status(500).json({ error: "Failed to generate forecast." }); // ✅ Explicit return
    }
});

// ✅ Start the server with logging
app.listen(port, () => {
    console.log(`✅ Server running on http://localhost:${port}`);
});
