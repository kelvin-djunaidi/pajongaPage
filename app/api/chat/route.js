import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Simple in-memory cache for JSON files
const jsonCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes TTL

// Helper function to get cached JSON or fetch and cache it
async function getCachedJson(url, cacheKey) {
  const now = Date.now();
  const cached = jsonCache.get(cacheKey);

  // Check if we have valid cached data
  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    console.log(`Using cached ${cacheKey} (age: ${Math.round((now - cached.timestamp) / 1000)}s)`);
    return cached.data;
  }

  // Fetch fresh data
  console.log(`Fetching fresh ${cacheKey} from ${url}`);
  try {
    const response = await fetch(url);
    const data = await response.json();

    // Cache the data
    jsonCache.set(cacheKey, {
      data,
      timestamp: now
    });

    console.log(`Cached ${cacheKey} (${JSON.stringify(data).length} chars)`);
    return data;
  } catch (error) {
    console.error(`Error fetching ${cacheKey}:`, error);
    // Return cached data if available, even if expired
    if (cached) {
      console.log(`Falling back to expired cache for ${cacheKey}`);
      return cached.data;
    }
    throw error;
  }
}

export async function POST(request) {
  try {
    const {
      message,
      history,
      currentScene,
      conversationState,
      character = "pajonga",
      language = "id",
    } = await request.json();

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          error: "OpenAI API key not configured",
          details: "Please set OPENAI_API_KEY in your .env.local file"
        },
        { status: 500 }
      );
    }

    // If user answers "Iya" or "Tae", don't process with AI - just return empty message
    // The script will be handled by the frontend
    if (message === "Iya" || message === "Tae") {
      return NextResponse.json({ message: "" });
    }

    // Load scenes data based on character
    let scenes = [];
    let characterName = "";
    let characterDescription = "";
    let characterLanguage = "";

    try {
      // Default to Pajonga
      // Use cached JSON loading
      scenes = await getCachedJson(
        `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/pajonga.json`,
        "pajonga-scenes"
      );
      characterName = "Pajonga";

      // Load Pajonga-specific dialect information from the JSON
      let pajongaDialect = "";
      try {
        // Look for dialect information in the first few scenes
        const dialectScene = scenes.find(scene => scene.dialect || scene.languageCharacteristics);
        if (dialectScene) {
          if (language === "en") {
            pajongaDialect = dialectScene.dialect?.en || dialectScene.languageCharacteristics?.en ||
              "MAKASSAR LANGUAGE CHARACTERISTICS (MUST BE USED THROUGHOUT THE RESPONSE):\n" +
              "- Casual, humorous, reflective; respectful. Makassar dialect consistent throughout response.\n" +
              "- Use distinctive Makassar expressions and cultural references.\n" +
              "- Maintain the character's unique voice and personality.";
          } else {
            pajongaDialect = dialectScene.dialect?.id || dialectScene.languageCharacteristics?.id ||
              "KARAKTERISTIK BAHASA MAKASSAR (WAJIB DIGUNAKAN DI SELURUH RESPONS):\n" +
              "- Santai, jenaka, reflektif; tetap hormat. Dialek Makassar konsisten di seluruh respons.\n" +
              "- Gunakan ekspresi Makassar yang khas dan referensi budaya.\n" +
              "- Pertahankan suara dan kepribadian karakter yang unik.";
          }
        }
      } catch (error) {
        console.error("Error loading Pajonga dialect:", error);
      }

      if (language === "en") {
        characterDescription =
          "You are Pajonga, the statue of Sultan Hasanuddin's horse that stands at Fort Rotterdam, Makassar since 1990. You were made by a French artist and are made of concrete.";
        characterLanguage = pajongaDialect || `MAKASSAR LANGUAGE CHARACTERISTICS (MUST BE USED THROUGHOUT THE RESPONSE)`;
      } else {
        characterDescription =
          "Kamu adalah Pajonga, patung kuda kampung dari Makassar yang hidup kembali sebagai pemandu Fort Rotterdam.";
        characterLanguage = pajongaDialect || `KARAKTERISTIK BAHASA MAKASSAR (WAJIB DIGUNAKAN DI SELURUH RESPONS):
        - Santai, jenaka, reflektif; tetap hormat. Dialek Makassar konsisten di seluruh respons.`;
      }
    } catch (error) {
      console.error("Error loading scenes:", error);
    }

    // Determine the actual current scene from conversation state if it indicates a scene change
    let actualCurrentScene = currentScene;
    console.log(
      "AI Route - Received currentScene:",
      currentScene,
      "conversationState:",
      conversationState,
      "character:",
      character,
      "language:",
      language
    );

    if (
      conversationState &&
      conversationState.includes("scene") &&
      conversationState.includes("_after_")
    ) {
      const sceneMatch = conversationState.match(/scene(\d+)_after_/);
      if (sceneMatch) {
        actualCurrentScene = parseInt(sceneMatch[1]);
        console.log(
          "AI Route - Scene determined from conversation state:",
          actualCurrentScene
        );
      }
    } else {
      console.log(
        "AI Route - No scene transition detected in conversation state"
      );
    }

    const currentSceneData = scenes.find(
      (scene) => scene.id === actualCurrentScene
    );
    console.log(
      "AI Route - Using scene:",
      actualCurrentScene,
      "Scene data:",
      currentSceneData
    );
    console.log(
      "AI Route - Available scenes:",
      scenes.map((s) => s.id)
    );

    const systemPrompt = `${characterDescription}

${characterLanguage}

${currentSceneData
        ? `
${language === "en"
          ? "You are currently in Scene"
          : "Saat ini kamu berada di Scene"
        } ${actualCurrentScene}. 

${language === "en" ? "SCENE CONTEXT:" : "KONTEKS SCENE INI:"}
${currentSceneData.messages ? currentSceneData.messages.map(msg => Array.isArray(msg.text) ? msg.text.join(' ') : msg.text).join(' ') : ''}

${language === "en" ? "IMPORTANT:" : "PENTING:"} 
- ${language === "en"
          ? "THE ENTIRE response MUST use"
          : "SELURUH respons HARUS menggunakan"
        } ${language === "en"
          ? "distinctive Makassar dialect"
          : "Makassar yang khas"
        } ${language === "en" ? "and be consistent" : "dan konsisten"}
- ${language === "en"
          ? "DO NOT change to other language styles in any part"
          : "JANGAN berubah ke gaya bahasa lain di bagian manapun"
        }
- ${language === "en"
          ? "Answer the user's question with language appropriate to the character"
          : "Jawab pertanyaan pengguna dengan bahasa yang sesuai karakter"
        }
- ${language === "en"
          ? "After answering the question, create a natural bridge/transition to the scene context"
          : "Setelah menjawab pertanyaan, buat jembatan/transisi yang natural ke konteks scene ini"
        }
- ${language === "en"
          ? "The bridge MUST use the same language, don't change language style"
          : "Jembatan HARUS menggunakan bahasa yang sama, jangan berubah gaya bahasa"
        }
- ${language === "en"
          ? "The bridge should briefly discuss the script content before the final question"
          : "Jembatan harus membicarakan sedikit tentang isi script sebelum pertanyaan akhir"
        }
- ${language === "en"
          ? "End the response WITH EXACTLY the question from the end of the scene script"
          : "Akhiri respons DENGAN PERSIS pertanyaan yang ada di akhir script scene ini"
        }
- ${language === "en"
          ? "DO NOT add other questions or additional questions"
          : "JANGAN tambahkan pertanyaan lain atau pertanyaan tambahan"
        }
- ${language === "en"
          ? "Don't create two separate parts - create one response that flows from answer to bridge to question"
          : "Jangan buat dua bagian terpisah - buat satu respons yang mengalir dari jawaban ke jembatan ke pertanyaan"
        }
- ${language === "en"
          ? "Only use questions that already exist in the script, don't create new questions"
          : "Hanya gunakan pertanyaan yang sudah ada di script, jangan buat pertanyaan baru"
        }
- ${language === "en"
          ? "MAINTAIN language style from beginning to end of response"
          : "PERTAHANKAN gaya bahasa dari awal sampai akhir respons"
        }

${language === "en"
          ? "MUST FOLLOW - RESPONSE STRUCTURE:"
          : "WAJIB DIIKUTI - STRUKTUR RESPONS:"
        }
1. ${language === "en"
          ? "Answer to user's question (language appropriate to character)"
          : "Jawaban pertanyaan pengguna (bahasa sesuai karakter)"
        }
2. ${language === "en"
          ? "Bridge to scene context (create natural transition that discusses this scene's context)"
          : "Jembatan ke konteks scene (buat transisi natural yang membicarakan konteks scene ini)"
        }
3. ${language === "en"
          ? "Final question from script (use question that exists in this scene)"
          : "Pertanyaan akhir dari script (gunakan pertanyaan yang ada di scene ini)"
        }

${language === "en" ? "IMPORTANT FOR BRIDGE:" : "PENTING UNTUK JEMBATAN:"}
- ${language === "en"
          ? "After answering the user's question, create a natural transition"
          : "Setelah menjawab pertanyaan pengguna, buat transisi yang natural"
        }
- ${language === "en"
          ? "The transition should discuss this scene's context (about me, the place, or situation in the scene)"
          : "Transisi harus membicarakan tentang konteks scene ini (tentang aku, tempat, atau situasi yang ada di scene)"
        }
- ${language === "en"
          ? "Don't jump directly to the question, create a flowing bridge"
          : "Jangan langsung loncat ke pertanyaan, buat jembatan yang mengalir"
        }
- ${language === "en"
          ? "Use language consistent with the character"
          : "Gunakan bahasa yang konsisten dengan karakter"
        }

${language === "en"
          ? "DON'T FORGET: Every response MUST end with the question from the scene script!"
          : "JANGAN LUPA: Setiap respons HARUS berakhir dengan pertanyaan dari script scene ini!"
        }

${language === "en" ? "Conversation State:" : "Conversation State:"} ${conversationState || "unknown"
        }`
        : `
${language === "en"
          ? "You are currently in Scene"
          : "Saat ini kamu berada di Scene"
        } ${actualCurrentScene}. ${language === "en"
          ? "Focus on the conversation context and provide relevant responses with language consistent with the character."
          : "Fokus pada konteks percakapan dan berikan respons yang relevan dengan bahasa yang konsisten sesuai karakter."
        }

${language === "en" ? "Conversation State:" : "Conversation State:"} ${conversationState || "unknown"
        }`
      }`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        ...history.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        { role: "user", content: message },
      ],
      max_tokens: 1000,
      temperature: 0.8,
    });

    let aiMessage = completion.choices[0].message.content;

    // AI now naturally incorporates scene context and question in its response
    // No need for manual concatenation

    return NextResponse.json({ message: aiMessage });
  } catch (error) {
    console.error("Error in chat API:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
