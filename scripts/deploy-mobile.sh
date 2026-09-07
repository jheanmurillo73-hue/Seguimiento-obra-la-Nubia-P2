#!/bin/bash
# Mobile Optimization - Merge & Deploy Script
# Usage: bash scripts/deploy-mobile.sh [merge|verify|rollback]

set -e

BRANCH_SOURCE="mobile-optimization"
BRANCH_TARGET="main"
COLOR_GREEN='\033[0;32m'
COLOR_YELLOW='\033[1;33m'
COLOR_RED='\033[0;31m'
NC='\033[0m' # No Color

print_header() {
    echo -e "\n${COLOR_GREEN}=== $1 ===${NC}\n"
}

print_warning() {
    echo -e "${COLOR_YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${COLOR_RED}❌ $1${NC}"
}

print_success() {
    echo -e "${COLOR_GREEN}✅ $1${NC}"
}

# Verify script
verify_merge() {
    print_header "Verificando estado de la rama"
    
    # Check if branch exists
    if ! git rev-parse --verify $BRANCH_SOURCE > /dev/null 2>&1; then
        print_error "Rama $BRANCH_SOURCE no existe"
        exit 1
    fi
    
    print_success "Rama $BRANCH_SOURCE existe"
    
    # Show commits
    echo -e "\n📋 Commits en $BRANCH_SOURCE (últimos 5):"
    git log $BRANCH_TARGET..$BRANCH_SOURCE --oneline -5
    
    # Show file changes
    echo -e "\n📝 Archivos modificados:"
    git diff $BRANCH_TARGET..$BRANCH_SOURCE --stat
    
    # Simulate merge
    print_header "Simulando merge"
    if git merge --no-commit --no-ff $BRANCH_SOURCE 2>/dev/null; then
        print_success "Merge simulado exitoso (sin conflictos)"
        git merge --abort
    else
        print_warning "Merge simulado encontró conflictos"
        git merge --abort
        echo -e "\n💡 Tip: Revisar conflictos manualmente antes de mergear"
    fi
    
    # Check build
    print_header "Verificando build"
    npm run lint > /dev/null 2>&1 && print_success "Lint passed" || print_warning "Lint tiene warnings"
    
    echo -e "\n${COLOR_GREEN}✨ Verificación completada${NC}"
}

# Merge script
perform_merge() {
    print_header "INICIANDO MERGE DE $BRANCH_SOURCE A $BRANCH_TARGET"
    
    # Verify first
    verify_merge
    
    echo -e "\n${COLOR_YELLOW}⚠️  Este es un proceso irreversible (pero puedes rollback con git revert)${NC}"
    read -p "¿Deseas continuar? (s/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        print_error "Merge cancelado"
        exit 1
    fi
    
    # Checkout target
    echo -e "\n1️⃣  Cambiando a rama $BRANCH_TARGET..."
    git checkout $BRANCH_TARGET
    git pull origin $BRANCH_TARGET
    print_success "Rama $BRANCH_TARGET actualizada"
    
    # Perform merge
    echo -e "\n2️⃣  Mergeando $BRANCH_SOURCE en $BRANCH_TARGET..."
    if git merge --no-ff origin/$BRANCH_SOURCE -m "Merge mobile-optimization: Complete mobile support for iOS and Android"; then
        print_success "Merge completado sin conflictos"
    else
        print_error "Merge encontró conflictos"
        echo -e "\n💡 Pasos para resolver:"
        echo "  1. Editar archivos conflictivos (buscar <<<<<<< ======= >>>>>>>)"
        echo "  2. git add <archivo-resuelto>"
        echo "  3. git merge --continue"
        echo "  4. Escribir mensaje de commit"
        exit 1
    fi
    
    # Verify build
    echo -e "\n3️⃣  Verificando build después del merge..."
    npm run build > /dev/null 2>&1
    print_success "Build exitoso"
    
    # Push
    echo -e "\n4️⃣  Subiendo cambios a origen..."
    git push origin $BRANCH_TARGET
    print_success "Push completado"
    
    # Summary
    print_header "MERGE COMPLETADO EXITOSAMENTE"
    echo -e "📊 Resumen:"
    git log -1 --oneline
    
    echo -e "\n📱 Próximos pasos:"
    echo "  1. Crear iconos PWA en public/icons/"
    echo "  2. Actualizar index.html con meta tags"
    echo "  3. Integrar MobileNavBar en App.tsx"
    echo "  4. Probar en dispositivos reales"
    echo "  5. Deploy a producción"
    
    echo -e "\n📖 Referencia: Leer DEPLOYMENT_GUIDE.md para pasos detallados"
}

# Rollback script
perform_rollback() {
    print_header "ROLLBACK MODE"
    
    print_warning "Esta acción revertirá el merge del mobile-optimization"
    read -p "¿Estás seguro? (s/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        echo "Rollback cancelado"
        exit 0
    fi
    
    # Get last commit
    LAST_COMMIT=$(git rev-parse HEAD)
    
    echo -e "\nRevertiendo commit: $LAST_COMMIT"
    git revert -m 1 $LAST_COMMIT
    
    print_success "Rollback completado"
    echo -e "\n💡 Ahora puedes hacer: git push origin $BRANCH_TARGET"
}

# Main script
if [ "$1" == "merge" ]; then
    perform_merge
elif [ "$1" == "verify" ]; then
    verify_merge
elif [ "$1" == "rollback" ]; then
    perform_rollback
else
    echo "🚀 Mobile Optimization - Merge & Deploy Script"
    echo ""
    echo "Uso: bash scripts/deploy-mobile.sh [comando]"
    echo ""
    echo "Comandos:"
    echo "  merge      - Mergear mobile-optimization a main"
    echo "  verify     - Verificar estado de merge sin ejecutar"
    echo "  rollback   - Revertir merge completamente"
    echo ""
    echo "Ejemplos:"
    echo "  bash scripts/deploy-mobile.sh verify   # Revisar primero"
    echo "  bash scripts/deploy-mobile.sh merge    # Hacer merge"
    echo ""
    echo "📖 Leer: DEPLOYMENT_GUIDE.md para instrucciones detalladas"
fi
