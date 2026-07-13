#!/bin/bash
# ==============================================================================
# Slyzah Ecosystem GitHub Deployment & Synchronization Script
# ==============================================================================
# This script initializes and pushes the audited states of:
# 1. slyzah-app (Root folder, excluding slyzah-web and slyzah-pro)
# 2. slyzah-web (slyzah-web/ folder)
# 3. slyzah-pro (slyzah-pro/ folder)
# ==============================================================================

set -e

# Load from .env if present
if [ -f .env ]; then
    set -a
    source .env
    set +a
fi

# Configuration Defaults / Fallbacks
TOKEN="${GITHUB_TOKEN}"
USERNAME="${GITHUB_USERNAME}"
APP_REPO_INPUT="${GITHUB_APP_REPO}"
WEB_REPO_INPUT="${GITHUB_WEB_REPO}"
PRO_REPO_INPUT="${GITHUB_PRO_REPO}"
BRANCH="${GITHUB_BRANCH:-main}"

echo "======================================================================"
echo "          SLYZAH MULTI-REPO DEPLOYMENT ENGINE"
echo "======================================================================"

# Prompt helper function
prompt_value() {
    local var_name="$1"
    local prompt_text="$2"
    local current_val="$3"
    
    if [ -z "$current_val" ]; then
        if [ -t 0 ]; then
            read -p "$prompt_text: " input_val
            eval "$var_name=\"$input_val\""
        else
            echo "❌ Error: $var_name is not set and terminal is non-interactive."
            exit 1
        fi
    else
        eval "$var_name=\"$current_val\""
    fi
}

# 1. Gather configuration
prompt_value USERNAME "Enter your GitHub username (e.g. slyzahofficial)" "$USERNAME"
prompt_value TOKEN "Enter your GitHub Personal Access Token (PAT) with repo scopes" "$TOKEN"

if [ -z "$USERNAME" ] || [ -z "$TOKEN" ]; then
    echo "❌ Error: Username and GitHub Token are required for authentication."
    exit 1
fi

prompt_value APP_REPO_INPUT "Enter slyzah-app GitHub Repo URL (e.g., https://github.com/slyzahofficial/slyzah-app)" "$APP_REPO_INPUT"
prompt_value WEB_REPO_INPUT "Enter slyzah-web GitHub Repo URL (e.g., https://github.com/slyzahofficial/slyzah-web)" "$WEB_REPO_INPUT"
prompt_value PRO_REPO_INPUT "Enter slyzah-pro GitHub Repo URL (e.g., https://github.com/slyzahofficial/slyzah-pro)" "$PRO_REPO_INPUT"

if [ -t 0 ] && [ -z "$GITHUB_BRANCH" ]; then
    read -t 5 -p "Enter Target Branch name [default: $BRANCH]: " branch_input || true
    if [ -n "$branch_input" ]; then
        BRANCH="$branch_input"
    fi
fi

# Function to format target URL with auth token
format_auth_url() {
    local raw_url="$1"
    # Remove https://
    local clean="${raw_url#https://}"
    # Remove git@github.com:
    clean="${clean#git@github.com:}"
    # Remove .git ending
    clean="${clean%.git}"
    echo "https://${USERNAME}:${TOKEN}@github.com/${clean}.git"
}

# Set git global identity if not set
if ! git config --global user.name >/dev/null 2>&1; then
    git config --global user.name "Slyzah Deployer"
fi
if ! git config --global user.email >/dev/null 2>&1; then
    git config --global user.email "deploy@slyzah.co.za"
fi

# ==============================================================================
# DEPLOYMENT STEP 1: SLYZAH-APP (Root Workspace)
# ==============================================================================
if [ -n "$APP_REPO_INPUT" ]; then
    echo -e "\n📦 [1/3] Preparing Slyzah-App (Root Client)..."
    
    # 1. Update .gitignore to exclude sub-modules in the app repo
    if ! grep -q "^slyzah-web/" .gitignore; then
        echo -e "\n# Sub-repo exclusions\nslyzah-web/\nslyzah-pro/" >> .gitignore
        echo "✅ Exclusions appended to root .gitignore"
    fi
    
    # Initialize/reinitialize Git
    git init
    
    # Check if we have remote 'origin'
    if git remote | grep -q "^origin$"; then
        git remote remove origin
    fi
    
    AUTH_APP_URL=$(format_auth_url "$APP_REPO_INPUT")
    git remote add origin "$AUTH_APP_URL"
    
    # Setup branch and commit
    git checkout -b "$BRANCH" 2>/dev/null || git checkout "$BRANCH"
    git add -A
    git commit -m "feat: audit and core platform synchronization" || echo "No changes to commit in slyzah-app."
    
    echo "🚀 Pushing slyzah-app to origin/$BRANCH..."
    git push -u origin "$BRANCH" --force
    echo "✅ Slyzah-App pushed successfully!"
else
    echo -e "\n⚠️ Skipping Slyzah-App (No Repo URL provided)"
fi

# ==============================================================================
# DEPLOYMENT STEP 2: SLYZAH-WEB
# ==============================================================================
if [ -n "$WEB_REPO_INPUT" ]; then
    echo -e "\n🌐 [2/3] Preparing Slyzah-Web..."
    cd slyzah-web
    
    git init
    if git remote | grep -q "^origin$"; then
        git remote remove origin
    fi
    
    AUTH_WEB_URL=$(format_auth_url "$WEB_REPO_INPUT")
    git remote add origin "$AUTH_WEB_URL"
    
    git checkout -b "$BRANCH" 2>/dev/null || git checkout "$BRANCH"
    git add -A
    git commit -m "feat: secure notification dispatcher and admin auth verification" || echo "No changes to commit in slyzah-web."
    
    echo "🚀 Pushing slyzah-web to origin/$BRANCH..."
    git push -u origin "$BRANCH" --force
    echo "✅ Slyzah-Web pushed successfully!"
    cd ..
else
    echo -e "\n⚠️ Skipping Slyzah-Web (No Repo URL provided)"
fi

# ==============================================================================
# DEPLOYMENT STEP 3: SLYZAH-PRO
# ==============================================================================
if [ -n "$PRO_REPO_INPUT" ]; then
    echo -e "\n💼 [3/3] Preparing Slyzah-Pro..."
    cd slyzah-pro
    
    git init
    if git remote | grep -q "^origin$"; then
        git remote remove origin
    fi
    
    AUTH_PRO_URL=$(format_auth_url "$PRO_REPO_INPUT")
    git remote add origin "$AUTH_PRO_URL"
    
    git checkout -b "$BRANCH" 2>/dev/null || git checkout "$BRANCH"
    git add -A
    git commit -m "feat: initial API client setup for secure cross-platform push and CIPC validation" || echo "No changes to commit in slyzah-pro."
    
    echo "🚀 Pushing slyzah-pro to origin/$BRANCH..."
    git push -u origin "$BRANCH" --force
    echo "✅ Slyzah-Pro pushed successfully!"
    cd ..
else
    echo -e "\n⚠️ Skipping Slyzah-Pro (No Repo URL provided)"
fi

echo -e "\n======================================================================"
echo "🎉 DEPLOYMENT AND SYNCHRONIZATION COMPLETE!"
echo "======================================================================"
