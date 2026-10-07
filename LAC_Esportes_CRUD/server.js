const http = require("http");
const fs = require("fs");
const path = require("path");
const {
  executar,
  consultar,
  consultarUm,
  inicializarBanco
} = require("./db");

const PORTA = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, "public");

const TIPOS = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml"
};

function responderJson(res, status, dados) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8"
  });
  res.end(JSON.stringify(dados));
}

function erroBanco(res, erro) {
  console.error(erro);
  const mensagem = String(erro.message || erro);

  if (mensagem.includes("UNIQUE constraint failed")) {
    return responderJson(
      res,
      409,
      { erro: "CPF ou e-mail já cadastrado." }
    );
  }

  return responderJson(res, 500, { erro: mensagem });
}

function lerCorpo(req) {
  return new Promise((resolve, reject) => {
    let corpo = "";

    req.on("data", pedaco => {
      corpo += pedaco;

      if (corpo.length > 5 * 1024 * 1024) {
        req.destroy();
        reject(new Error("Dados enviados excedem o limite de 5 MB."));
      }
    });

    req.on("end", () => {
      try {
        resolve(corpo ? JSON.parse(corpo) : {});
      } catch {
        reject(new Error("JSON inválido."));
      }
    });

    req.on("error", reject);
  });
}

function validarCliente(c) {
  const campos = [
    "cliente_cpf",
    "cliente_telefone",
    "cliente_nome",
    "cliente_bairro",
    "cliente_cidade",
    "cliente_uf",
    "cliente_logradouro",
    "cliente_numero_residencia",
    "cliente_cep",
    "cliente_email"
  ];

  return campos.every(campo =>
    typeof c[campo] === "string" && c[campo].trim()
  );
}

function validarProduto(p) {
  return (
    typeof p.produto_nome === "string" &&
    p.produto_nome.trim() &&
    typeof p.produto_categoria === "string" &&
    p.produto_categoria.trim() &&
    Number.isFinite(Number(p.produto_preco)) &&
    Number(p.produto_preco) >= 0 &&
    Number.isInteger(Number(p.produto_estoque)) &&
    Number(p.produto_estoque) >= 0 &&
    typeof p.produto_descricao === "string"
  );
}

async function apiClientes(req, res, caminho) {
  if (req.method === "GET" && caminho === "/api/clientes") {
    return responderJson(
      res,
      200,
      await consultar("SELECT * FROM clientes ORDER BY cliente_id DESC")
    );
  }

  if (req.method === "POST" && caminho === "/api/clientes") {
    const c = await lerCorpo(req);

    if (!validarCliente(c)) {
      return responderJson(res, 400, {
        erro: "Preencha todos os campos obrigatórios do cliente."
      });
    }

    const resultado = await executar(
      `INSERT INTO clientes (
        cliente_cpf, cliente_telefone, cliente_nome, cliente_bairro,
        cliente_cidade, cliente_uf, cliente_logradouro,
        cliente_numero_residencia, cliente_cep, cliente_email
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        c.cliente_cpf.trim(),
        c.cliente_telefone.trim(),
        c.cliente_nome.trim(),
        c.cliente_bairro.trim(),
        c.cliente_cidade.trim(),
        c.cliente_uf.trim().toUpperCase(),
        c.cliente_logradouro.trim(),
        c.cliente_numero_residencia.trim(),
        c.cliente_cep.trim(),
        c.cliente_email.trim()
      ]
    );

    return responderJson(
      res,
      201,
      await consultarUm("SELECT * FROM clientes WHERE cliente_id = ?", [
        resultado.lastID
      ])
    );
  }

  const match = caminho.match(/^\/api\/clientes\/(\d+)$/);
  if (!match) return false;

  const id = Number(match[1]);

  if (req.method === "PUT") {
    const c = await lerCorpo(req);

    if (!validarCliente(c)) {
      return responderJson(res, 400, {
        erro: "Preencha todos os campos obrigatórios do cliente."
      });
    }

    const resultado = await executar(
      `UPDATE clientes SET
        cliente_cpf = ?, cliente_telefone = ?, cliente_nome = ?,
        cliente_bairro = ?, cliente_cidade = ?, cliente_uf = ?,
        cliente_logradouro = ?, cliente_numero_residencia = ?,
        cliente_cep = ?, cliente_email = ?
       WHERE cliente_id = ?`,
      [
        c.cliente_cpf.trim(),
        c.cliente_telefone.trim(),
        c.cliente_nome.trim(),
        c.cliente_bairro.trim(),
        c.cliente_cidade.trim(),
        c.cliente_uf.trim().toUpperCase(),
        c.cliente_logradouro.trim(),
        c.cliente_numero_residencia.trim(),
        c.cliente_cep.trim(),
        c.cliente_email.trim(),
        id
      ]
    );

    if (!resultado.changes) {
      return responderJson(res, 404, { erro: "Cliente não encontrado." });
    }

    return responderJson(
      res,
      200,
      await consultarUm("SELECT * FROM clientes WHERE cliente_id = ?", [id])
    );
  }

  if (req.method === "DELETE") {
    const resultado = await executar(
      "DELETE FROM clientes WHERE cliente_id = ?",
      [id]
    );

    if (!resultado.changes) {
      return responderJson(res, 404, { erro: "Cliente não encontrado." });
    }

    return responderJson(res, 200, { removido: id });
  }

  return false;
}

async function apiProdutos(req, res, caminho) {
  if (req.method === "GET" && caminho === "/api/produtos") {
    return responderJson(
      res,
      200,
      await consultar("SELECT * FROM produtos ORDER BY produto_id DESC")
    );
  }

  if (req.method === "POST" && caminho === "/api/produtos") {
    const p = await lerCorpo(req);

    if (!validarProduto(p)) {
      return responderJson(res, 400, {
        erro: "Preencha corretamente os dados do produto."
      });
    }

    const resultado = await executar(
      `INSERT INTO produtos (
        produto_nome, produto_categoria, produto_preco,
        produto_estoque, produto_descricao, produto_imagem
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        p.produto_nome.trim(),
        p.produto_categoria.trim(),
        Number(p.produto_preco),
        Number(p.produto_estoque),
        p.produto_descricao.trim(),
        p.produto_imagem || ""
      ]
    );

    return responderJson(
      res,
      201,
      await consultarUm("SELECT * FROM produtos WHERE produto_id = ?", [
        resultado.lastID
      ])
    );
  }

  const match = caminho.match(/^\/api\/produtos\/(\d+)$/);
  if (!match) return false;

  const id = Number(match[1]);

  if (req.method === "PUT") {
    const p = await lerCorpo(req);

    if (!validarProduto(p)) {
      return responderJson(res, 400, {
        erro: "Preencha corretamente os dados do produto."
      });
    }

    const resultado = await executar(
      `UPDATE produtos SET
        produto_nome = ?, produto_categoria = ?, produto_preco = ?,
        produto_estoque = ?, produto_descricao = ?, produto_imagem = ?
       WHERE produto_id = ?`,
      [
        p.produto_nome.trim(),
        p.produto_categoria.trim(),
        Number(p.produto_preco),
        Number(p.produto_estoque),
        p.produto_descricao.trim(),
        p.produto_imagem || "",
        id
      ]
    );

    if (!resultado.changes) {
      return responderJson(res, 404, { erro: "Produto não encontrado." });
    }

    return responderJson(
      res,
      200,
      await consultarUm("SELECT * FROM produtos WHERE produto_id = ?", [id])
    );
  }

  if (req.method === "DELETE") {
    const resultado = await executar(
      "DELETE FROM produtos WHERE produto_id = ?",
      [id]
    );

    if (!resultado.changes) {
      return responderJson(res, 404, { erro: "Produto não encontrado." });
    }

    return responderJson(res, 200, { removido: id });
  }

  return false;
}

async function apiMovimentos(req, res, caminho) {
  if (req.method === "GET" && caminho === "/api/movimentos") {
    const movimentos = await consultar(`
      SELECT
        m.*,
        c.cliente_nome
      FROM movimento m
      JOIN clientes c ON c.cliente_id = m.cliente_id
      ORDER BY m.movimento_id DESC
    `);

    return responderJson(res, 200, movimentos);
  }

  if (req.method !== "POST" || caminho !== "/api/movimentos") {
    return false;
  }

  const dados = await lerCorpo(req);
  const clienteId = Number(dados.cliente_id);
  const items = Array.isArray(dados.items) ? dados.items : [];

  if (!Number.isInteger(clienteId) || items.length === 0) {
    return responderJson(res, 400, {
      erro: "Cliente e produtos da venda são obrigatórios."
    });
  }

  const cliente = await consultarUm(
    "SELECT * FROM clientes WHERE cliente_id = ?",
    [clienteId]
  );

  if (!cliente) {
    return responderJson(res, 404, { erro: "Cliente não encontrado." });
  }

  await executar("BEGIN TRANSACTION");

  try {
    let total = 0;
    const itensCalculados = [];

    for (let i = 0; i < items.length; i++) {
      const produtoId = Number(items[i].produto_id);
      const quantidade = Number(items[i].quantidade);
      const desconto = Number(items[i].desconto || 0);

      if (!Number.isInteger(produtoId) ||
          !Number.isInteger(quantidade) ||
          quantidade <= 0 ||
          desconto < 0) {
        throw new Error("Item da venda inválido.");
      }

      const produto = await consultarUm(
        "SELECT * FROM produtos WHERE produto_id = ?",
        [produtoId]
      );

      if (!produto) {
        throw new Error(`Produto #${produtoId} não encontrado.`);
      }

      if (produto.produto_estoque < quantidade) {
        throw new Error(
          `Estoque insuficiente para "${produto.produto_nome}".`
        );
      }

      const bruto = produto.produto_preco * quantidade;
      const valor = Math.max(0, bruto - desconto);
      total += valor;

      itensCalculados.push({
        produto,
        quantidade,
        desconto,
        valor
      });
    }

    const data = new Date().toLocaleString("pt-BR");

    const movimento = await executar(
      `INSERT INTO movimento (
        cliente_id, movimento_data, movimento_valor
      ) VALUES (?, ?, ?)`,
      [clienteId, data, total]
    );

    for (let i = 0; i < itensCalculados.length; i++) {
      const item = itensCalculados[i];

      await executar(
        `INSERT INTO item_movimento (
          movimento_id, produto_id, item_numero,
          item_quantidade, item_desconto, item_valor
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          movimento.lastID,
          item.produto.produto_id,
          i + 1,
          item.quantidade,
          item.desconto,
          item.valor
        ]
      );

      await executar(
        `UPDATE produtos
         SET produto_estoque = produto_estoque - ?
         WHERE produto_id = ?`,
        [item.quantidade, item.produto.produto_id]
      );
    }

    await executar("COMMIT");

    return responderJson(res, 201, {
      movimento_id: movimento.lastID,
      cliente_id: clienteId,
      movimento_data: data,
      movimento_valor: total
    });
  } catch (erro) {
    try {
      await executar("ROLLBACK");
    } catch {}
    return responderJson(res, 400, { erro: erro.message });
  }
}

function servirArquivo(res, urlPath) {
  let relativo = urlPath === "/" ? "index.html" : urlPath.replace(/^\/+/, "");
  relativo = decodeURIComponent(relativo);

  const arquivo = path.resolve(PUBLIC, relativo);
  if (!arquivo.startsWith(path.resolve(PUBLIC) + path.sep)) {
    return responderJson(res, 403, { erro: "Acesso negado." });
  }

  if (!fs.existsSync(arquivo) || !fs.statSync(arquivo).isFile()) {
    return responderJson(res, 404, { erro: "Arquivo não encontrado." });
  }

  const tipo = TIPOS[path.extname(arquivo).toLowerCase()] ||
    "application/octet-stream";

  res.writeHead(200, { "Content-Type": tipo });
  res.end(fs.readFileSync(arquivo));
}

async function iniciar() {
  await inicializarBanco();

  const servidor = http.createServer(async (req, res) => {
    const caminho = req.url.split("?")[0];

    try {
      if (caminho.startsWith("/api/clientes")) {
        const tratado = await apiClientes(req, res, caminho);
        if (tratado !== false) return;
      }

      if (caminho.startsWith("/api/produtos")) {
        const tratado = await apiProdutos(req, res, caminho);
        if (tratado !== false) return;
      }

      if (caminho.startsWith("/api/movimentos")) {
        const tratado = await apiMovimentos(req, res, caminho);
        if (tratado !== false) return;
      }

      if (req.method === "GET") {
        return servirArquivo(res, caminho);
      }

      return responderJson(res, 404, { erro: "Rota não encontrada." });
    } catch (erro) {
      return erroBanco(res, erro);
    }
  });

  servidor.on("error", erro => {
    if (erro.code === "EADDRINUSE") {
      console.error(`A porta ${PORTA} já está sendo usada.`);
    } else {
      console.error(erro);
    }
  });

  servidor.listen(PORTA, () => {
    console.log("");
    console.log("LAC Esportes iniciado.");
    console.log(`Banco SQLite: ${path.join(__dirname, "banco.db")}`);
    console.log(`Site: http://localhost:${PORTA}`);
    console.log("Para desligar: Ctrl+C");
    console.log("");
  });
}

iniciar().catch(erro => {
  console.error("Não foi possível iniciar:", erro);
  process.exit(1);
});
