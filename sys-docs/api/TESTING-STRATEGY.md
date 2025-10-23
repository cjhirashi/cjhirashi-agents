# Testing Strategy - cjhirashi-agents MVP

**Documento:** Estrategia Completa de Testing para Fase 4  
**Versión:** 1.0  
**Fecha:** 2025-10-22  
**Estado:** ACTIVO  
**Responsable:** Tester Agent  
**Última Actualización:** 2025-10-22  
**Próxima Revisión:** Pre-Fase 5 (Backend Implementation)

---

## Tabla de Contenidos

1. [Introducción & Testing Pyramid](#1-introducción--testing-pyramid)
2. [Unit Testing](#2-unit-testing)
3. [Integration Testing](#3-integration-testing)
4. [Component Testing](#4-component-testing)
5. [E2E Testing](#5-e2e-testing)
6. [Performance Testing](#6-performance-testing)
7. [Database Testing](#7-database-testing)
8. [Security Testing](#8-security-testing)
9. [Test Data & Fixtures](#9-test-data--fixtures)
10. [CI/CD Integration](#10-cicd-integration)
11. [Mocking & Stubbing](#11-mocking--stubbing)
12. [Test Coverage & Reporting](#12-test-coverage--reporting)

---

## 1. Introducción & Testing Pyramid

### 1.1 Filosofía de Testing

**Objetivo Principal:**  
Garantizar calidad, confianza, velocidad y costo-eficiencia en todo el ciclo de desarrollo del MVP de cjhirashi-agents.

**Principios Fundamentales:**

1. **Confianza en el Código:**
   - Desarrolladores confían en que cambios no rompen funcionalidad
   - Tests automatizan validación de comportamiento
   - Refactoring es seguro con cobertura adecuada

2. **Velocidad de Desarrollo:**
   - Tests rápidos permiten iteración ágil
   - Feedback inmediato en caso de errores
   - CI/CD permite deploys seguros

3. **Costo-Eficiencia:**
   - Bugs detectados temprano son más baratos de arreglar
   - Testing automatizado reduce tiempo manual
   - Inversión en tests reduce deuda técnica

4. **Calidad Profesional:**
   - >80% code coverage mínimo
   - Zero bugs críticos en producción
   - SLAs de performance cumplidos

---

### 1.2 Testing Pyramid

**Estructura de testing optimizada para velocidad y costo:**

```
           /          /  \         E2E Tests (10%)
         /----\        - Slow, expensive
        /      \       - User journeys
       /--------\      - Critical paths
      /               /   INTEGRATION \  Integration Tests (20%)
    /      TESTS      \ - API endpoints
   /------------------\ - Database interactions
  /                     /    UNIT TESTS        \ Unit Tests (70%)
/________________________\ - Fast, cheap
                           - Business logic
                           - Utilities
```

**Distribución de Tests:**

| Nivel | Porcentaje | Velocidad | Costo | Enfoque |
|-------|-----------|-----------|-------|---------|
| Unit | 70% | <100ms | Bajo | Lógica pura, utils |
| Integration | 20% | <2s | Medio | APIs, DB |
| E2E | 10% | <30s | Alto | User flows |

---

### 1.3 Coverage Targets

**Objetivos de cobertura por componente:**

| Componente | Line Coverage | Branch Coverage | Function Coverage |
|------------|---------------|-----------------|-------------------|
| Business Logic | >90% | >85% | >95% |
| API Endpoints | >85% | >80% | >90% |
| Utilities | >80% | >75% | >85% |
| UI Components | >75% | >70% | >80% |
| **TOTAL GOAL** | **>80%** | **>75%** | **>85%** |

**Excepciones (no requeridas >80%):**
- Configuration files
- Type definitions
- Mock data

---

### 1.4 Test Execution Speed

**SLAs de velocidad de tests:**

| Suite | Target Time | Max Time | Tests Count |
|-------|-------------|----------|-------------|
| Unit Tests | <30s | <60s | 500+ |
| Integration Tests | <2min | <5min | 100+ |
| E2E Tests | <5min | <10min | 20+ |
| **Full Suite** | **<8min** | **<15min** | **600+** |

---

### 1.5 Testing Tools Stack

**Frameworks & Libraries:**

```typescript
// package.json (testing dependencies)
{
  "devDependencies": {
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.1.0",
    "@testing-library/user-event": "^14.5.0",
    "jest": "^29.7.0",
    "vitest": "^1.0.0",
    "supertest": "^6.3.3",
    "msw": "^2.0.0",
    "cypress": "^13.6.0",
    "playwright": "^1.40.0",
    "codecov": "^3.8.3"
  }
}
```

**Tool Selection Rationale:**
- **Jest/Vitest:** Fast unit testing with great TypeScript support
- **React Testing Library:** Component testing following best practices
- **Supertest:** API integration testing
- **MSW:** Mock external services
- **Cypress/Playwright:** E2E testing with browser automation
- **Codecov:** Coverage reporting

---

## 2. Unit Testing

### 2.1 Scope & Objectives

**What to Unit Test:**
- ✅ Utility functions (transformations, formatters)
- ✅ Business logic (LLM selector, RAG scoring)
- ✅ Validation schemas (Zod schemas)
- ✅ Error handling (custom error classes)
- ✅ Data transformations (mappers, serializers)
- ❌ NOT: External API calls (mock them)
- ❌ NOT: Database queries (integration tests)

**Objectives:**
- Validate pure functions work correctly
- Test edge cases and error scenarios
- Ensure 70% of total test coverage
- Execute in <100ms per test

---

### 2.2 Testing Framework: Jest + Vitest

**Configuration:**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.config.ts',
        '**/*.d.ts',
        '**/types/',
        '**/mocks/'
      ],
      statements: 80,
      branches: 75,
      functions: 85,
      lines: 80
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/lib': path.resolve(__dirname, './src/lib'),
      '@/components': path.resolve(__dirname, './src/components')
    }
  }
});
```

