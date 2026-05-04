
```javascript
import Anthropic from "@anthropic-ai/sdk";
import * as readline from "readline";

const client = new Anthropic();

interface TextAnalysis {
  wordCount: number;
  uniqueWords: number;
  averageWordLength: number;
  characterCount: number;
  sentenceCount: number;
  paragraphCount: number;
  mostCommonWords: Array<{ word: string; count: number }>;
  wordFrequency: Record<string, number>;
}

function analyzeText(text: string): TextAnalysis {
  // Remove extra whitespace and normalize text
  const normalizedText = text.trim();

  // Count characters (excluding spaces)
  const characterCount = normalizedText.replace(/\s/g, "").length;

  // Split into words
  const words = normalizedText
    .toLowerCase()
    .match(/\b[\w']+\b/g) || [];
  const wordCount = words.length;

  // Count unique words
  const wordFrequency: Record<string, number> = {};
  words.forEach((word) => {
    wordFrequency[word] = (wordFrequency[word] || 0) + 1;
  });
  const uniqueWords = Object.keys(wordFrequency).length;

  // Calculate average word length
  const totalWordLength = words.reduce((sum, word) => sum + word.length, 0);
  const averageWordLength =
    wordCount > 0 ? totalWordLength / wordCount : 0;

  // Count sentences (simple approximation)
  const sentenceCount =
    (normalizedText.match(/[.!?]+/g) || []).length || 1;

  // Count paragraphs (split by double newlines or single newlines)
  const paragraphCount = normalizedText
    .split(/\n\s*\n|\n/)
    .filter((p) => p.trim().length > 0).length;

  // Get most common words (top 10)
  const sortedWords = Object.entries(wordFrequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  const mostCommonWords = sortedWords.map(([word, count]) => ({
    word,
    count,
  }));

  return {
    wordCount,
    uniqueWords,
    averageWordLength: parseFloat(averageWordLength.toFixed(2)),
    characterCount,
    sentenceCount,
    paragraphCount,
    mostCommonWords,
    wordFrequency,
  };
}

async function getAIInsight(
  text: string,
  analysis: TextAnalysis
): Promise<string> {
  const analysisPrompt = `Analiza el siguiente texto y proporciona insights útiles sobre su contenido y estilo.

Texto: "${text.substring(0, 500)}${text.length > 500 ? "..." : ""}"

Estadísticas:
- Total de palabras: ${analysis.wordCount}
- Palabras únicas: ${analysis.uniqueWords}
- Longitud promedio de palabras: ${analysis.averageWordLength} caracteres
- Total de caracteres: ${analysis.characterCount}
- Número de oraciones: ${analysis.sentenceCount}
- Número de párrafos: ${analysis.paragraphCount}

Por favor, proporciona un breve análisis (2-3 oraciones) sobre la calidad, complejidad y estilo del texto.`;

  const message = await client.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content: analysisPrompt,
      },
    ],
  });

  const response = message.content[0];
  if (response.type === "text") {
    return response.text;
  }

  return "No se pudo obtener el análisis de IA.";
}

function formatAnalysis(analysis: TextAnalysis): string {
  let output =
    "\n=== ESTADÍSTICAS DE TEXTO ===\n";
  output += `Total de palabras: ${analysis.wordCount}\n`;
  output += `Palabras únicas: ${analysis.uniqueWords}\n`;
  output += `Ratio de unicidad: ${((analysis.uniqueWords / analysis.wordCount) * 100).toFixed(2)}%\n`;
  output += `Longitud promedio de palabras: ${analysis.averageWordLength} caracteres\n`;
  output += `Total de caracteres: ${analysis.characterCount}\n`;
  output += `Número de oraciones: ${analysis.sentenceCount}\n`;
  output += `Número de párrafos: ${analysis.paragraphCount}\n`;

  output += "\n=== TOP 10 PALABRAS MÁS FRECUENTES ===\n";
  analysis.mostCommonWords.forEach((item, index) => {
    output += `${index + 1}. "${item.word}": ${item.count} veces\n`;
  });

  return output;
}

async function main(): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(prompt, (answer) => {
        resolve(answer);
      });
    });
  };

  console.log("\n╔════════════════════════════════════════╗");
  console.log("║   ANALIZADOR DE TEXTO CON IA          ║");
  console.log("║   Conteo de palabras y estadísticas   ║");
  console.log("╚════════════════════════════════════════╝\n");

  const userInput = await question(
    'Ingresa el texto a analizar (o "ejemplo" para usar texto de demostración):\n> '
  );

  let textToAnalyze = userInput