import express from "express";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import path from "path";

const supabaseUrl = 'https://qmruagjcmkznncjolske.supabase.co';
const supabaseKey = 'sb_publishable_pzN7kam4BbGjYP8JdDKodA_Kn_GJUnU';
const supabase = createClient(supabaseUrl, supabaseKey);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: Proxy Supabase request to bypass browser-side "Load failed" issues
  app.get("/api/track/:id", async (req, res) => {
    const { id } = req.params;
    const userInput = id.trim();

    try {
      // Try exact match first
      let { data, error: supabaseError } = await supabase
        .from('shipments')
        .select('*')
        .eq('tracking_id', userInput)
        .maybeSingle();

      // If no match and input has spaces, try without spaces
      if (!data && !supabaseError && userInput.includes(' ')) {
        const noSpaces = userInput.replace(/\s/g, '');
        const { data: retryData, error: retryError } = await supabase
          .from('shipments')
          .select('*')
          .eq('tracking_id', noSpaces)
          .maybeSingle();
        data = retryData;
        supabaseError = retryError;
      }

      if (supabaseError) {
        return res.status(500).json({ error: supabaseError.message });
      }
      
      return res.json(data);
    } catch (err: any) {
      console.error("Server-side Supabase error:", err);
      return res.status(500).json({ error: "Internal server error connecting to database" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
