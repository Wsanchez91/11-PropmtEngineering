import dotenv from 'dotenv';
dotenv.config();

import { OpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";
import { StructuredOutputParser } from 'langchain/output_parsers';
import express, { Request, Response } from 'express';

const router = express.Router();

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
    throw new Error("Missing OpenAI API key in environment variables");
}

// ✅ Initialize OpenAI Model with explicit API key type
const model = new OpenAI({
    apiKey: apiKey as string, // Ensure apiKey is always a string
    modelName: "gpt-4",
    temperature: 0.7,
});

// ✅ Define structured output schema using Zod
const forecastSchema = z.object({
    location: z.string(),
    temperature: z.string(),
    condition: z.string(),
});

// ✅ Define the parser for structured output
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
router.post('/forecast', async (req: Request, res: Response) => {
    try {
        const { location } = req.body;
        if (!location) {
            return res.status(400).json({ error: "Location is required." });
        }

        // Create prompt input
        const prompt = await promptTemplate.format({ location });

        // Call OpenAI API
        const response = await model.invoke(prompt);

        return res.json({ forecast: response });
    } catch (error) {
        console.error("Error generating forecast:", error);
        return res.status(500).json({ error: "Failed to generate forecast." });
    }
});

export default router;