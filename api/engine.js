module.exports = async function handler(req, res) {
    // 1. Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // 2. Check for the API Key in Vercel Environment Variables
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'Server configuration error: Missing API Key' });
    }

    try {
        const { action, image, query } = req.body;

        if (!image) {
            return res.status(400).json({ error: 'No image provided' });
        }

        // --- ACTION 1: GENERATE SCHEMATIC ---
        if (action === 'generate') {
            const visionPrompt = "You are an expert architect. Analyze this image. Describe the exact 2D footprint, shape, and structural layout of the main building. Ignore all background, cars, and clutter. I need a highly detailed description of the building's geometry so I can draw a precise 2D schematic blueprint from it.";
            
            const visionRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: visionPrompt }, { inlineData: { mimeType: "image/png", data: image } }] }]
                })
            });
            
            const visionData = await visionRes.json();
            if (visionData.error) throw new Error("Vision Error: " + visionData.error.message);
            const extractedGeometry = visionData.candidates[0].content.parts[0].text;

            const imagenPrompt = `Draft a clean, 2D architectural schematic blueprint from a top-down view. Stark white background, highly technical sharp black structural lines only. No shadows, no cars, no trees. Layout geometry to follow: ${extractedGeometry}`;

            const imagenRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    instances: { prompt: imagenPrompt },
                    parameters: { sampleCount: 1 }
                })
            });

            const imagenData = await imagenRes.json();
            if (imagenData.error) throw new Error("Drafting Error: " + imagenData.error.message);
            
            return res.status(200).json({ image: imagenData.predictions[0].bytesBase64Encoded });
        }

        // --- ACTION 2: SITE INTELLIGENCE ---
        else if (action === 'intel') {
            const prompt = `Perform a high-level site intelligence report for Cincinnati Air Conditioning Company. Analyze the provided image. Provide technical bullet points: 1. Building Footprint Observations. 2. Estimated Square Footage. 3. Optimal HVAC Unit Placements (Roof or Ground). 4. Site Access Points. Keep it concise, professional, and architectural. Use markdown format.`;

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: "image/png", data: image } }] }]
                })
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            return res.status(200).json({ text: data.candidates[0].content.parts[0].text });
        }

        // --- ACTION 3: CHAT CONSULTANT ---
        else if (action === 'chat') {
            const prompt = `The user is asking an architectural/HVAC question about this building/site. Original image provided. Context: You are an architectural consultant for Cincinnati Air Conditioning Company. Keep answers brief and technical. Query: ${query}`;

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: "image/png", data: image } }] }]
                })
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            return res.status(200).json({ text: data.candidates[0].content.parts[0].text });
        }

        else {
            return res.status(400).json({ error: 'Invalid action requested' });
        }

    } catch (error) {
        console.error("Engine Error:", error);
        return res.status(500).json({ error: error.message });
    }
};
