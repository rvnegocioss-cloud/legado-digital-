# Teste de Rate Limit — Middleware Central

## Resumo
O middleware em `app/middleware.ts` implementa rate limiting global centralizado para Legado Digital:

- **Login/logout**: 3 requisições/minuto
- **Upload**: 5/min (família), 10/min (staff)
- **API geral**: 30/min

Tracking por:
- Email (se usuário autenticado via Supabase Auth)
- IP (fallback para usuários anônimos, via `x-forwarded-for` ou `x-real-ip`)

Garbage collection automático de entries > 1 hora.

## Como Testar

### Pré-requisitos
- Servidor local rodando: `npm run dev`
- curl ou Postman instalado
- Bearer token de autenticação (opcional, pra teste de staff)

### Teste 1: Rate Limit de Login (3/min)

```bash
# Rápido, chamadas seguidas (última deve retornar 429)
for i in {1..5}; do
  echo "Tentativa $i:"
  curl -X POST http://localhost:3000/api/familia-login \
    -H "Content-Type: application/json" \
    -d '{"slug": "test-memorial", "senha": "123456"}' \
    -s | jq '.error // .ok'
done
```

Esperado: 3 respostas de erro (401/404, memorial não existe), 4ª chamada em 429 (rate limit).

### Teste 2: Rate Limit de Upload (5/min - família)

```bash
# Simular 5 uploads rapidamente
for i in {1..7}; do
  echo "Upload $i:"
  # Criar file fake
  echo "fake image" > /tmp/test.png
  
  curl -X POST http://localhost:3000/api/familia-upload \
    -H "Content-Type: multipart/form-data" \
    -F "file=@/tmp/test.png" \
    -F "homenagemId=abc123" \
    -F "tipo=foto" \
    -s | jq '.error // .ok'
  
  sleep 0.1 # Pequena pausa entre tentativas
done
```

Esperado: 5 respostas OK (ou erro específico de validação), 6ª em 429 (rate limit).

### Teste 3: Headers de Rate Limit

```bash
# Verificar headers informativos
curl -X POST http://localhost:3000/api/familia-login \
  -H "Content-Type: application/json" \
  -d '{"slug": "test", "senha": "123"}' \
  -i 2>&1 | grep "X-RateLimit"
```

Esperado: headers como
```
X-RateLimit-Limit: 3
X-RateLimit-Remaining: 2
X-RateLimit-Reset: 1726123456789
```

### Teste 4: Resposta 429 (Rate Limit)

```bash
# Disparar 4 tentativas de login rapidamente (limite é 3)
for i in {1..4}; do
  curl -s -X POST http://localhost:3000/api/familia-login \
    -H "Content-Type: application/json" \
    -d '{"slug": "test", "senha": "123"}' \
    -w "\n%{http_code}\n"
done
```

Esperado: últimas 2 respostas com status `429` e JSON:
```json
{
  "error": "Too many requests",
  "message": "Limite de 3 requisições por minuto excedido",
  "retryAfter": 60
}
```

### Teste 5: Cache Headers (Dev vs Prod)

```bash
# /admin/* deve ter Cache-Control: no-store
curl -X GET http://localhost:3000/admin/mapa \
  -s -i 2>&1 | grep -i "cache-control"

# Esperado: Cache-Control: no-store, must-revalidate

# /parceiro/* deve ter cache privado de 5 min
curl -X GET http://localhost:3000/parceiro \
  -s -i 2>&1 | grep -i "cache-control"

# Esperado: Cache-Control: private, max-age=300
```

## Monitoramento — Logs de Rate Limit

Quando um rate limit é excedido, o servidor loga:

```
[RATE_LIMIT] 429 - user@email.com | Rota: /api/familia-login | Tipo: login | Count: 4/3 | IP: 192.168.1.1
```

Ou para usuários anônimos:

```
[RATE_LIMIT] 429 - 192.168.1.1 | Rota: /api/familia-login | Tipo: login | Count: 4/3 | IP: 192.168.1.1
```

## Detecção de Ataque

Se ver múltiplos 429 do mesmo IP em logs de produção:

```bash
# Buscar padrão
tail -f logs | grep "RATE_LIMIT.*429.*192.168.1.1"
```

**Ação:** O middleware não bloqueia (fail-open), apenas retorna 429. Se padrão persistir, considerar:
1. Bloquear IP no firewall/WAF (Vercel + Cloudflare)
2. Aumentar limite temporário (editar `RATE_LIMIT_CONFIG` em `app/middleware.ts`)
3. Resetar rate limit manual (via `/api/admin/reset-ratelimit` — não implementado ainda, TODO)

## Garbage Collection

Rate limits expiram automaticamente após 1 hora sem uso. Limpeza acontece:
- **Periódica**: A cada 100 requisições (1% chance por request)
- **On-demand**: Ao iniciar middleware

Sem configuração necessária — opera silenciosamente em background.

## Stack Técnico

- **Armazenamento**: Map em memória (`rateLimitCache`)
- **Janela de tempo**: 60 segundos (renovável a cada minuto)
- **Identificação**: Email (autenticado) ou IP (anônimo)
- **Chave de cache**: `ratelimit:{identifier}:{routeType}`
- **Cleanup**: entries < now - 3600s (1 hora)

## Próximos Passos

1. ✓ Implementado middleware central
2. ✓ Implementado utilitários em lib/rateLimitUtil.ts
3. TODO: Rotas de admin pra resetar rate limit (staff-only)
4. TODO: Dashboard de rate limit (visualizar padrões de ataque)
5. TODO: Integração com Redis se volume crescer muito (hoje em memória é OK pra MVP)
6. TODO: IP whitelisting pra aplicações internas (ex: webhooks do Supabase)

## Troubleshooting

**Problema: Rate limit está muito rígido, bloqueando usuários legítimos**

Solução: Aumentar limite em `RATE_LIMIT_CONFIG` em `app/middleware.ts`, seção correspondente (ex: `upload.limit: 5` → `10`).

**Problema: Taxa de memory growth (vazamento?)**

Solução: Verificar se garbage collection está funcionando. Se entrada ainda aparecer após 1 hora sem uso, há bug. Abrir issue com logs.

**Problema: Rate limit não está funcionando (todas as requisições passam)**

Solução: Verificar se `next.config.ts` tem `skipMiddlewareUrlNormalization: true` (desabilita middleware). Não adicione essa config.
