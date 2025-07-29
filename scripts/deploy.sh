#!/bin/bash

# GTD Tool Deployment Script
# This script handles the deployment process for the GTD Tool application

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="gtd-tool"
BUILD_DIR="dist"
BACKUP_DIR="backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    log_info "Checking dependencies..."
    
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    
    log_success "All dependencies are available"
}

# Install dependencies
install_dependencies() {
    log_info "Installing dependencies..."
    npm ci --production=false
    log_success "Dependencies installed"
}

# Run tests
run_tests() {
    log_info "Running tests..."
    npm run test:run
    log_success "All tests passed"
}

# Run linting
run_linting() {
    log_info "Running linting..."
    npm run lint
    log_success "Linting passed"
}

# Build the application
build_application() {
    log_info "Building application..."
    
    # Set build timestamp and git commit hash
    export VITE_BUILD_TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    if command -v git &> /dev/null && git rev-parse --git-dir > /dev/null 2>&1; then
        export VITE_GIT_COMMIT_HASH=$(git rev-parse --short HEAD)
    fi
    
    npm run build
    log_success "Application built successfully"
}

# Optimize build output
optimize_build() {
    log_info "Optimizing build output..."
    
    # Create gzip compressed versions of static assets
    if command -v gzip &> /dev/null; then
        find $BUILD_DIR -type f \( -name "*.js" -o -name "*.css" -o -name "*.html" \) -exec gzip -k {} \;
        log_success "Gzip compression completed"
    else
        log_warning "gzip not available, skipping compression"
    fi
    
    # Create brotli compressed versions if available
    if command -v brotli &> /dev/null; then
        find $BUILD_DIR -type f \( -name "*.js" -o -name "*.css" -o -name "*.html" \) -exec brotli -k {} \;
        log_success "Brotli compression completed"
    else
        log_warning "brotli not available, skipping brotli compression"
    fi
}

# Validate build output
validate_build() {
    log_info "Validating build output..."
    
    if [ ! -d "$BUILD_DIR" ]; then
        log_error "Build directory not found"
        exit 1
    fi
    
    if [ ! -f "$BUILD_DIR/index.html" ]; then
        log_error "index.html not found in build directory"
        exit 1
    fi
    
    # Check if critical files exist
    local critical_files=("sw.js" "manifest.json")
    for file in "${critical_files[@]}"; do
        if [ ! -f "$BUILD_DIR/$file" ]; then
            log_warning "$file not found in build directory"
        fi
    done
    
    log_success "Build validation completed"
}

# Create backup of current deployment
create_backup() {
    if [ -d "$BUILD_DIR" ] && [ "$1" != "--skip-backup" ]; then
        log_info "Creating backup..."
        mkdir -p $BACKUP_DIR
        cp -r $BUILD_DIR "$BACKUP_DIR/${PROJECT_NAME}_${TIMESTAMP}"
        log_success "Backup created at $BACKUP_DIR/${PROJECT_NAME}_${TIMESTAMP}"
    fi
}

# Deploy to static hosting (example for Netlify/Vercel)
deploy_static() {
    log_info "Deploying to static hosting..."
    
    # This is a placeholder - replace with actual deployment commands
    # For Netlify: netlify deploy --prod --dir=dist
    # For Vercel: vercel --prod
    # For AWS S3: aws s3 sync dist/ s3://your-bucket-name --delete
    
    log_warning "Static deployment not configured. Please configure your deployment target."
    log_info "Build files are ready in the $BUILD_DIR directory"
}

# Cleanup old backups (keep last 5)
cleanup_backups() {
    if [ -d "$BACKUP_DIR" ]; then
        log_info "Cleaning up old backups..."
        ls -t $BACKUP_DIR | tail -n +6 | xargs -I {} rm -rf "$BACKUP_DIR/{}"
        log_success "Backup cleanup completed"
    fi
}

# Main deployment function
deploy() {
    local skip_backup=false
    local skip_tests=false
    local target="static"
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-backup)
                skip_backup=true
                shift
                ;;
            --skip-tests)
                skip_tests=true
                shift
                ;;
            --target)
                target="$2"
                shift 2
                ;;
            -h|--help)
                echo "Usage: $0 [OPTIONS]"
                echo "Options:"
                echo "  --skip-backup    Skip creating backup of current deployment"
                echo "  --skip-tests     Skip running tests"
                echo "  --target TARGET  Deployment target (static, netlify, vercel)"
                echo "  -h, --help       Show this help message"
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    log_info "Starting deployment process..."
    
    check_dependencies
    install_dependencies
    
    if [ "$skip_tests" != true ]; then
        run_tests
        run_linting
    fi
    
    if [ "$skip_backup" != true ]; then
        create_backup
    fi
    
    build_application
    optimize_build
    validate_build
    
    case $target in
        static)
            deploy_static
            ;;
        *)
            log_error "Unknown deployment target: $target"
            exit 1
            ;;
    esac
    
    cleanup_backups
    
    log_success "Deployment completed successfully!"
    log_info "Build timestamp: $(date)"
    if [ -n "$VITE_GIT_COMMIT_HASH" ]; then
        log_info "Git commit: $VITE_GIT_COMMIT_HASH"
    fi
}

# Run deployment if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    deploy "$@"
fi