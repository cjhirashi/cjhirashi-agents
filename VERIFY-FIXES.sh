#!/bin/bash

echo "======================================"
echo "VERIFICACIÓN DE FIXES FASE 1"
echo "======================================"
echo ""

# FIX #1: Verificar React 18.2.0
echo "✓ FIX #1: React Downgrade"
npm list react 2>/dev/null | grep -q "react@18.2.0"
if [ $? -eq 0 ]; then
  echo "   ✅ React 18.2.0 correctamente configurado"
else
  echo "   ❌ React no es 18.2.0 - ejecuta: npm install"
fi
echo ""

# FIX #2: Verificar Turbopack disabled
echo "✓ FIX #2: Turbopack Disabled"
grep -q "turbopack: false" next.config.ts
if [ $? -eq 0 ]; then
  echo "   ✅ Turbopack deshabilitado en next.config.ts"
else
  echo "   ❌ Turbopack no está deshabilitado"
fi
echo ""

# FIX #3: Verificar .env.example existe
echo "✓ FIX #3: Environment Variables"
if [ -f ".env.example" ]; then
  echo "   ✅ .env.example creado"
else
  echo "   ❌ .env.example no encontrado"
fi
echo ""

# Verificar .env.local
if [ -f ".env.local" ]; then
  echo "   ✅ .env.local existe"
  if grep -q "NEXTAUTH_SECRET" .env.local; then
    echo "   ✅ NEXTAUTH_SECRET configurado"
  else
    echo "   ⚠️  NEXTAUTH_SECRET no configurado - agrega a .env.local"
  fi
else
  echo "   ⚠️  .env.local no existe - copia desde .env.example"
fi
echo ""

echo "======================================"
echo "PRÓXIMOS PASOS:"
echo "======================================"
echo "1. Copiar template: cp .env.example .env.local"
echo "2. Llenar variables: NEXTAUTH_SECRET, DATABASE_URL, etc"
echo "3. Instalar deps: npm install"
echo "4. Build: npm run build"
echo "5. Dev: npm run dev"
echo ""
echo "Para detalles, ver: PHASE1-FIXES-APPLIED.md"
echo "======================================"
