#!/bin/bash

# Setup script for Folio
echo "🚀 Setting up Folio..."

# 1. Environment variables
if [ ! -f .env ]; then
  echo "📄 Creating .env from .env.example..."
  cp .env.example .env
else
  echo "✅ .env already exists."
fi

# 2. Knowledge directory
if [ ! -d knowledge ]; then
  echo "📂 Creating knowledge/ directory..."
  mkdir -p knowledge
  echo "📄 Copying templates from knowledge.example/..."
  cp knowledge.example/*.json knowledge/
  cp knowledge.example/example.md knowledge/
else
  echo "✅ knowledge/ directory already exists."
fi

# 3. Persona config
if [ ! -f persona.md ]; then
  echo "📄 Creating persona.md from persona.md.example..."
  cp persona.md.example persona.md
else
  echo "✅ persona.md already exists."
fi

echo "✨ Setup complete! Don't forget to edit .env and files in knowledge/ with your information."
