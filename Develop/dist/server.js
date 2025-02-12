import dotenv from 'dotenv';
import express from 'express';
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
// ✅ Create a prompt function that takes the user input and passes it through the model
const promptFunc = async (input) => {
    try {
        // Format the prompt with the user input
        const formattedPrompt = await promptTemplate.format({ location: input });
        // Call the model with the formatted prompt
        const response = await model.invoke(formattedPrompt);
        // Parse the response
        return parser.parse(response);
    }
    catch (error) {
        console.error("Error:", error);
        throw new Error("Failed to process the request.");
    }
};
// ✅ Endpoint to handle request
app.post('/forecast', async (req, res) => {
    try {
        const location = req.body.location;
        if (!location) {
            res.status(400).json({
                error: 'Please provide a location in the request body.',
            });
            return;
        }
        const result = await promptFunc(location);
        res.json({ result });
    }
    catch (error) {
        if (error instanceof Error) {
            console.error('Error:', error.message);
        }
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
