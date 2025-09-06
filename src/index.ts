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
export * from "./lib/nomd/nomd.js";
export * from "./lib/notion/client.js";

// Import core dependencies
import { Noblog } from "./lib/nomd/nomd.js";
import { GetAllPosts } from "./lib/notion/client.js";
import { Client } from "@notionhq/client";
import { NotionToMarkdown } from "notion-to-md";

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
    const pages = await GetAllPosts();
    console.log(`✅ Found ${pages.length} published posts`);

    console.log("📝 Creating Noblog instance with default settings...");
    const noblog = new Noblog(pages);

    console.log("🏗️  Processing pages and generating markdown...");
    await noblog.Collect(true);

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
 * Test Function: Notion-to-Markdown Direct Test
 *
 * Tests the raw notion-to-md functionality:
 * 1. Creates Notion client with API secret
 * 2. Initializes NotionToMarkdown converter
 * 3. Converts a specific page to markdown
 * 4. Outputs raw markdown for inspection
 *
 * This is useful for:
 * - Testing notion-to-md behavior directly
 * - Debugging markdown conversion issues
 * - Comparing raw vs noblog-processed output
 *
 * Note: Uses a hardcoded page ID for testing
 */
const testNotionToMarkdown = async () => {
  console.log("🧪 Testing Notion-to-Markdown Direct Conversion...");
  console.log("===============================================");

  try {
    console.log("🔑 Creating Notion client...");
    const notion = new Client({
      auth: process.env.NOTION_API_SECRET ?? "",
    });

    console.log("🔄 Initializing NotionToMarkdown converter...");
    const n2m = new NotionToMarkdown({ notionClient: notion });

    // Hardcoded test page ID - this should be replaced with a valid page ID from your Notion
    const testPageId = "10cf16f8-9950-8008-a146-e7971c864d3a";
    console.log(`📄 Converting page ${testPageId} to markdown...`);

    const markdown = await n2m.pageToMarkdown(testPageId);

    console.log("📝 Raw Markdown Output:");
    console.log("----------------------");
    console.log(markdown);
    console.log("----------------------");
    console.log("✨ Notion-to-markdown test completed!");
  } catch (error) {
    console.error("❌ Notion-to-markdown test failed:");
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

    case "n2m":
    case "notion-to-md":
      console.log("Running Notion-to-Markdown direct test...\n");
      testNotionToMarkdown();
      break;

    case "help":
    case "--help":
    case "-h":
      console.log("Available commands:");
      console.log("  test, noblog     - Run Noblog integration test");
      console.log("  n2m, notion-to-md - Run Notion-to-Markdown direct test");
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
