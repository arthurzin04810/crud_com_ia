# LAC Esportes - CRUD com SQLite

Projeto da LAC Esportes com as telas integradas a um banco SQLite.

## Estrutura

- `server.js` - servidor HTTP e API REST.
- `db.js` - conexão, criação e migração do banco.
- `banco.db` - criado automaticamente na primeira execução.
- `schema.sql` / `sql/schema.sql` - estrutura das tabelas.
- `sql/seed.sql` - dados de exemplo fornecidos no projeto.
- `public/index.html` - telas.
- `public/script.js` - lógica das telas e integração com a API.
- `public/style.css` - estilos.

## Requisitos

Node.js instalado.

## Como executar

Abra o terminal dentro da pasta do projeto e rode:

```bash
npm install
npm start
```

Depois acesse:

http://localhost:3000

## CRUD disponível

### Clientes
- Cadastrar
- Listar
- Editar
- Excluir

### Produtos
- Cadastrar
- Listar
- Editar
- Excluir
- Imagem salva no SQLite

### Vendas
- Produtos são colocados no carrinho.
- Na finalização, é escolhido o cliente cadastrado.
- A venda é gravada em `movimento`.
- Cada produto é gravado em `item_movimento`.
- O estoque é reduzido automaticamente.
- A operação é feita em transação SQLite.

## Observação sobre a imagem

A tela original possui upload de imagem, mas o SQL original não tinha uma coluna para armazená-la. Para que a imagem continue funcionando depois de reiniciar o sistema, o projeto adiciona `produto_imagem TEXT` à tabela `produtos`.

O `db.js` também faz uma migração automática caso exista um `banco.db` antigo sem essa coluna.

## Dados de exemplo

O arquivo `sql/seed.sql` contém os `INSERT`s fornecidos no projeto. Eles são separados da inicialização automática para não duplicar dados toda vez que o servidor iniciar.

## API

- `GET /api/clientes`
- `POST /api/clientes`
- `PUT /api/clientes/:id`
- `DELETE /api/clientes/:id`
- `GET /api/produtos`
- `POST /api/produtos`
- `PUT /api/produtos/:id`
- `DELETE /api/produtos/:id`
- `GET /api/movimentos`
- `POST /api/movimentos`
