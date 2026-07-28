# App LS Autotruck — Android (Capacitor)

App que **embrulha a plataforma** `https://plataforma.lsautotruckrastreios.com.br` num aplicativo nativo, com **notificações nativas e som por alerta**. Compila **na nuvem (GitHub Actions)** — não precisa de PC potente nem de instalar nada.

## Como funciona (a ideia)
- O app abre a plataforma por dentro (tela cheia, sem barra de navegador). Como carrega o site ao vivo, **quando a gente atualiza a plataforma, o app atualiza junto** — sem reenviar pra loja.
- As notificações passam a ser **nativas** (canais Android), o que permite **som diferente por alerta**: sirene no bloqueio, bipe na ignição, etc. (arquivos em `sounds/`).

## As fases

### Fase 1 — App que abre e funciona (SEM depender de conta nenhuma)
Já dá pra gerar um APK de teste que abre a plataforma no celular.
- O build roda no GitHub (grátis). Ele gera o arquivo **`app-debug.apk`**.
- Você baixa esse APK e instala no seu Android (modo teste) pra ver o app funcionando.

### Fase 2 — Notificações nativas + som por alerta
Precisa ligar o app ao Firebase (o mesmo projeto `ls-autotruck` que já usamos no site):
1. **(Você)** No Firebase Console → projeto ls-autotruck → Adicionar app **Android** com o pacote `br.com.lsautotruckrastreios.app` → baixar o **`google-services.json`**.
2. **(Eu)** Coloco esse arquivo no projeto + ligo os canais de som (sirene/bipe/alerta) + ajusto o conector pra mandar cada alerta no canal certo.
3. Novo build → o app passa a tocar o **som certo por alerta, mesmo fechado**.

### Fase 3 — Publicar na Play Store
1. **(Você)** Criar a conta Google Play Developer (US$ 25, uma vez).
2. **(Eu)** Gero o APK/AAB **assinado** (versão de loja) + te passo o passo a passo dos cliques.
3. **(Você)** Sobe na loja com a identidade LS (ícone, descrição, política de privacidade).

## O que EU faço
- Todo o código e configuração do app.
- O fluxo de build na nuvem (GitHub Actions).
- Os canais de som + integração com o push que já existe.
- Te guiar clique a clique nas partes de conta.

## O que só VOCÊ pode fazer (contas)
- Ligar o app no Firebase (Fase 2) → baixar o `google-services.json`.
- Criar a conta Google Play e subir o app (Fase 3, US$ 25).
- Baixar o APK de teste do GitHub e instalar no celular pra testar.

## Estrutura do projeto
```
mobile-app/
  capacitor.config.json   # nome, pacote e URL da plataforma
  package.json            # dependencias (Capacitor + push)
  www/index.html          # tela de abertura (splash)
  sounds/                 # sons dos alertas (sirene, bipe, alerta)
.github/workflows/build-android.yml  # compila o APK na nuvem
```

## Como gerar o APK de teste (Fase 1)
1. No GitHub, aba **Actions** → workflow **"Build App Android (LS)"** → **Run workflow**.
2. Esperar ~5 min. Ao terminar, baixar o artefato **LS-Autotruck-Android** (é o `app-debug.apk`).
3. Enviar o APK pro celular e instalar (permitir "instalar de fontes desconhecidas").
