import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import path from "path";

const app = express();
// Extreme payload limits for very large academic PDFs (textbooks)
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ extended: false, limit: '500mb' }));

// Set timeout for large file requests
app.use((req, res, next) => {
  // Increase timeout for PDF routes
  if (req.url.includes('/uploads/') || req.url.includes('/documents/')) {
    req.setTimeout(300000); // 5 minutes for large PDFs
    res.setTimeout(300000);
  }
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Serve PDF.js worker files
  app.use('/pdf-worker', express.static(path.join(process.cwd(), 'node_modules/pdfjs-dist/build')));
  
  // Serve uploaded files with enhanced settings for large files
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads'), {
    maxAge: 86400000, // 24 hours cache for uploaded files
    setHeaders: (res, path) => {
      // Enhanced headers for large PDF files
      if (path.endsWith('.pdf')) {
        res.setHeader('Accept-Ranges', 'bytes'); // Enable range requests
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
        res.setHeader('Content-Type', 'application/pdf');
      }
      if (path.endsWith('.docx')) {
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      }
    }
  }));

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Serve the app on the port specified in the environment variable PORT
// Default to 3000 for development to avoid port conflicts
const port = parseInt(process.env.PORT || '3000', 10);
  server.listen({
    port,
    host: "localhost",
  }, () => {
    log(`serving on port ${port}`);
    
    // Open browser automatically in development
    if (app.get("env") === "development") {
      const url = `http://localhost:${port}`;
      log(`🌐 Opening browser to ${url}`);
      
      // Use different methods to open browser based on platform
      import('child_process').then(({ exec }) => {
        const platform = process.platform;
        
        let command;
        if (platform === 'win32') {
          command = `start ${url}`;
        } else if (platform === 'darwin') {
          command = `open ${url}`;
        } else {
          command = `xdg-open ${url}`;
        }
        
        exec(command, (error: any) => {
          if (error) {
            log(`❌ Failed to open browser: ${error.message}`);
            log(`📱 Please open your browser and navigate to: ${url}`);
          } else {
            log(`✅ Browser opened successfully`);
          }
        });
      }).catch((error) => {
        log(`❌ Failed to import child_process: ${error.message}`);
        log(`📱 Please open your browser and navigate to: ${url}`);
      });
    }
  });
})();
