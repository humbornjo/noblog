/**
 * Noblog Test Script
 *
 * This file serves as both the main entry point and a test script for the noblog package.
 * It provides functions to test the core functionality and can be run directly for debugging.
 *
 * Usage:
 *   npm run dev              # Run the main test function
 *   node dist/index.js test  # Run noblog test
 *   node dist/index.js n2m   # Run notion-to-md test
 *
 * Environment Variables Required:
 *   NOTION_API_SECRET      - Your Notion API secret key
 *   NOBLOG_DATABASE_ID     - Your Notion database ID
 */

import "dotenv/config";

// Re-export main modules for external usage
export * from "./lib/noblog/noblog.js";
export * from "./lib/notion/client.js";

// Import core dependencies
import { Noblog } from "./lib/noblog/noblog.js";
import { ListPages } from "./lib/notion/client.js";

/**
 * Test Function: Noblog Integration
 *
 * Tests the complete noblog workflow:
 * 1. Fetches all published posts from Notion database
 * 2. Creates Noblog instance with default settings
 * 3. Processes and saves markdown files with Astro frontmatter
 *
 * This tests the entire pipeline including:
 * - Notion API integration
 * - Page-to-markdown conversion
 * - File structure generation
 * - Astro frontmatter assembly
 *
 * Expected Output: Markdown files in ./src/pages/posts/ directory
 */
const testNoblogIntegration = async () => {
  console.log("🧪 Testing Noblog Integration...");
  console.log("================================");

  try {
    console.log("📡 Fetching posts from Notion database...");
    const pages = await ListPages();

    console.log("📝 Creating Noblog instance with default settings...");
    const noblog = new Noblog(pages);

    const blocks = await noblog.ConvPage(
      "26af16f8-9950-8007-83aa-e5a13ed31a63",
    );

    await noblog.RenderJelly(blocks, true);

    // console.log("🏗️ Processing pages and generating markdown...");
    // await noblog.Collect(true);

    console.log("✨ Noblog integration test completed successfully!");
    console.log("📁 Check ./src/pages/posts/ for generated files");
  } catch (error) {
    console.error("❌ Noblog integration test failed:");
    if (error instanceof Error) {
      console.error(`   Error: ${error.message}`);
      console.error(`   Stack: ${error.stack}`);
    } else {
      console.error("   Unknown error occurred");
    }
    process.exit(1);
  }
};

/**
 * Environment Validation Helper
 *
 * Checks if required environment variables are set
 * Provides helpful error messages if they're missing
 */
const validateEnvironment = () => {
  const requiredEnvVars = [
    { name: "NOTION_API_SECRET", description: "Your Notion API secret key" },
    { name: "NOBLOG_DATABASE_ID", description: "Your Notion database ID" },
  ];

  const missing = requiredEnvVars.filter((env) => !process.env[env.name]);

  if (missing.length > 0) {
    console.error("❌ Missing required environment variables:");
    missing.forEach((env) => {
      console.error(`   - ${env.name}: ${env.description}`);
    });
    console.error("\n💡 Set them in your .env file or export them:");
    console.error("   export NOTION_API_SECRET='your-secret-key'");
    console.error("   export NOBLOG_DATABASE_ID='your-database-id'");
    return false;
  }

  return true;
};

// ==================== Main Execution ====================

/**
 * Main entry point for the test script
 * Handles command-line arguments and runs appropriate tests
 */
const main = () => {
  const command = process.argv[2];

  console.log("🚀 Noblog Test Script");
  console.log("=====================");

  // Validate environment before running tests
  if (!validateEnvironment()) {
    process.exit(1);
  }

  switch (command) {
    case "test":
    case "noblog":
      console.log("Running Noblog integration test...\n");
      testNoblogIntegration();
      break;

    case "help":
    case "--help":
    case "-h":
      console.log("Available commands:");
      console.log("  test, noblog     - Run Noblog integration test");
      console.log("  help             - Show this help message");
      console.log("\nExamples:");
      console.log("  node dist/index.js test");
      console.log("  node dist/index.js n2m");
      break;

    default:
      console.log("No command specified. Running default Noblog test...\n");
      testNoblogIntegration();
  }
};

// Run main function
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
