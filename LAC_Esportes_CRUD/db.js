const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

const caminhoBanco = path.join(__dirname, "banco.db");
const caminhoSchema = path.join(__dirname, "sql", "schema.sql");

const db = new sqlite3.Database(caminhoBanco);

function executar(sql, parametros = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, parametros, function (erro) {
      if (erro) return reject(erro);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function consultar(sql, parametros = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, parametros, (erro, linhas) => {
      if (erro) return reject(erro);
      resolve(linhas);
    });
  });
}

function consultarUm(sql, parametros = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, parametros, (erro, linha) => {
      if (erro) return reject(erro);
      resolve(linha);
    });
  });
}

async function inicializarBanco() {
  await executar("PRAGMA foreign_keys = ON");

  const schema = fs.readFileSync(caminhoSchema, "utf8");
  const comandos = schema
    .split(";")
    .map(sql => sql.trim())
    .filter(Boolean);

  for (const comando of comandos) {
    await executar(comando);
  }

  // Compatibilidade com bancos antigos do projeto.
  const colunas = await consultar("PRAGMA table_info(produtos)");
  const possuiImagem = colunas.some(coluna => coluna.name === "produto_imagem");

  if (!possuiImagem) {
    await executar(
      "ALTER TABLE produtos ADD COLUMN produto_imagem TEXT NOT NULL DEFAULT ''"
    );
  }
}

module.exports = {
  db,
  executar,
  consultar,
  consultarUm,
  inicializarBanco,
  caminhoBanco
};
