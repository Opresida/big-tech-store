# =============================================================================
# Teste de concorrência — dois clientes disputando a última unidade
# =============================================================================
# O cenário que o prompt exige resolver: "dois clientes não podem comprar a
# última unidade". Aqui ele é provocado de verdade, com duas conexões
# simultâneas, e não apenas descrito.
#
# Roteiro:
#   1. um produto é levado a exatamente 1 unidade;
#   2. a sessão A abre transação, vende a unidade e SEGURA a transação aberta;
#   3. a sessão B tenta vender a mesma unidade e fica bloqueada no FOR UPDATE;
#   4. A confirma; B destrava, relê o saldo já zerado e é recusada.
#
# O resultado correto é UMA venda e UMA recusa — nunca duas vendas, nunca
# estoque negativo.
#
# RODE EM BRANCH DESCARTÁVEL.
#   $env:DATABASE_URL = '<url-da-branch>'
#   pwsh testes/concorrencia.ps1
# =============================================================================

$ErrorActionPreference = 'Continue'
$env:PGCLIENTENCODING = 'UTF8'

$psql = 'C:\Program Files\PostgreSQL\17\bin\psql.exe'
$conn = $env:DATABASE_URL
if (-not $conn) { Write-Error 'Defina DATABASE_URL'; exit 2 }

$produto = 'p20'
$tmp = [System.IO.Path]::GetTempPath()

# Etiqueta única da execução: sem isso, uma segunda rodada contaria as vendas
# da rodada anterior e o teste passaria por engano.
$tag = 'C' + (Get-Date -Format 'HHmmss')

# Todo SQL vai para arquivo gravado em UTF-8. Passar texto acentuado por `-c`
# entrega os bytes na codepage do console (Latin-1), e o servidor recusa —
# foi assim que a primeira versão deste teste "passou" sem testar nada.
$arqPrep = Join-Path $tmp 'bts_conc_prep.sql'
Set-Content -Path $arqPrep -Encoding UTF8 -Value @"
SELECT fn_ajustar_estoque('$produto', 1, 'Preparação do teste de concorrência');
SELECT sku, estoque FROM produto WHERE id = '$produto';
"@

Write-Output '=== 1. Levando o produto a exatamente 1 unidade ==='
& $psql $conn -q -v ON_ERROR_STOP=1 -f $arqPrep
if ($LASTEXITCODE -ne 0) { Write-Error 'Preparação falhou'; exit 1 }

# --- Sessão A: vende e segura a transação aberta por 6 segundos --------------
$sqlA = @"
BEGIN;
SELECT fn_finalizar_pedido('Cliente A $tag', 'pix', '[{"produto_id": "$produto", "quantidade": 1}]'::JSONB, 'site') AS pedido_a;
SELECT pg_sleep(6);
COMMIT;
"@
$arqA = Join-Path $tmp 'bts_conc_a.sql'
$saidaA = Join-Path $tmp 'bts_conc_a.out'
Set-Content -Path $arqA -Value $sqlA -Encoding UTF8

Write-Output ''
Write-Output '=== 2. Sessão A: vende a última unidade e segura a transação ==='
$procA = Start-Process -FilePath $psql `
  -ArgumentList @($conn, '-v', 'ON_ERROR_STOP=1', '-f', $arqA) `
  -NoNewWindow -PassThru -RedirectStandardOutput $saidaA -RedirectStandardError "$saidaA.err"

# Tempo para A entrar na transação e travar a linha antes de B chegar.
Start-Sleep -Seconds 2

# --- Sessão B: tenta a mesma unidade ----------------------------------------
$sqlB = @"
BEGIN;
SELECT fn_finalizar_pedido('Cliente B $tag', 'pix', '[{"produto_id": "$produto", "quantidade": 1}]'::JSONB, 'site') AS pedido_b;
COMMIT;
"@
$arqB = Join-Path $tmp 'bts_conc_b.sql'
Set-Content -Path $arqB -Value $sqlB -Encoding UTF8

Write-Output ''
Write-Output '=== 3. Sessão B: tenta a MESMA unidade (deve bloquear e ser recusada) ==='
$inicio = Get-Date
$saidaB = & $psql $conn -f $arqB 2>&1
$espera = [math]::Round(((Get-Date) - $inicio).TotalSeconds, 1)
$saidaB | ForEach-Object { Write-Output "  $_" }
Write-Output "  (a sessão B ficou $espera s bloqueada esperando a A)"

$procA.WaitForExit()
Write-Output ''
Write-Output '=== 4. Saída da sessão A ==='
Get-Content $saidaA -ErrorAction SilentlyContinue | ForEach-Object { Write-Output "  $_" }

Write-Output ''
Write-Output '=== 5. Resultado: uma venda, uma recusa, estoque nunca negativo ==='
$arqFim = Join-Path $tmp 'bts_conc_fim.sql'
Set-Content -Path $arqFim -Encoding UTF8 -Value @"
SELECT p.sku, p.estoque,
       (SELECT count(*) FROM item_pedido i
          JOIN pedido pe ON pe.id = i.pedido_id
         WHERE i.produto_id = '$produto'
           AND pe.cliente_nome LIKE '%$tag') AS vendas_da_disputa
  FROM produto p WHERE p.id = '$produto';

DO `$blk`$
DECLARE v_estoque INT; v_vendas INT;
BEGIN
  SELECT estoque INTO v_estoque FROM produto WHERE id = '$produto';
  SELECT count(*) INTO v_vendas FROM item_pedido i
    JOIN pedido pe ON pe.id = i.pedido_id
   WHERE i.produto_id = '$produto' AND pe.cliente_nome LIKE '%$tag';
  ASSERT v_vendas = 1, 'esperava exatamente 1 venda na disputa, houve ' || v_vendas;
  ASSERT v_estoque = 0, 'esperava estoque 0 ao fim, veio ' || v_estoque;
  RAISE NOTICE 'Concorrência OK: 1 venda, 1 recusa, estoque final 0.';
END `$blk`$;
"@
& $psql $conn -q -v ON_ERROR_STOP=1 -f $arqFim
$ok = ($LASTEXITCODE -eq 0)

Remove-Item $arqA, $arqB, $arqPrep, $arqFim, $saidaA, "$saidaA.err" -ErrorAction SilentlyContinue
if (-not $ok) { Write-Error 'TESTE DE CONCORRÊNCIA FALHOU'; exit 1 }
