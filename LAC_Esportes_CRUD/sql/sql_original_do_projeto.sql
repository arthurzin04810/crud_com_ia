-- Tabela de Clientes
CREATE TABLE IF NOT EXISTS clientes (
    cliente_id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_cpf TEXT NOT NULL UNIQUE,
    cliente_telefone TEXT NOT NULL,
    cliente_nome TEXT NOT NULL,
    cliente_bairro TEXT NOT NULL,
    cliente_cidade TEXT NOT NULL,
    cliente_uf TEXT NOT NULL,
    cliente_logradouro TEXT NOT NULL,
    cliente_numero_residencia TEXT NOT NULL,
    cliente_cep TEXT NOT NULL,
    cliente_email TEXT NOT NULL UNIQUE
);

-- Tabela de Produtos
CREATE TABLE IF NOT EXISTS produtos (
    produto_id INTEGER PRIMARY KEY AUTOINCREMENT,
    produto_nome TEXT NOT NULL,
    produto_categoria TEXT NOT NULL,
    produto_preco REAL NOT NULL,
    produto_estoque INTEGER NOT NULL,
    produto_descricao TEXT NOT NULL
);

-- Tabela de Movimento
CREATE TABLE IF NOT EXISTS movimento (
    movimento_id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER NOT NULL,
    movimento_data TEXT NOT NULL,
    movimento_valor REAL NOT NULL,
    FOREIGN KEY(cliente_id) REFERENCES clientes(cliente_id) ON DELETE CASCADE
);

-- Tabela de Itens do movimento
CREATE TABLE IF NOT EXISTS item_movimento (
    item_id INTEGER PRIMARY KEY AUTOINCREMENT,
    movimento_id INTEGER NOT NULL,
    produto_id INTEGER NOT NULL,
    item_numero INTEGER NOT NULL,
    item_quantidade INTEGER NOT NULL,
    item_desconto REAL NOT NULL,
    item_valor REAL NOT NULL,
    FOREIGN KEY(movimento_id) REFERENCES movimento(movimento_id) ON DELETE CASCADE,
    FOREIGN KEY(produto_id) REFERENCES produtos(produto_id) ON DELETE CASCADE
);

-- Exemplos fornecidos
INSERT INTO clientes(cliente_cpf, cliente_telefone, cliente_nome, cliente_bairro, cliente_cidade, cliente_uf, cliente_logradouro, cliente_numero_residencia, cliente_cep, cliente_email)
VALUES ('68732086040','45998480808', 'Luis', 'Vila Adriana', 'Foz do Iguaçu', 'Paraná', 'av. Ayrtonn Senna','2911', '8446322', 'luiseduardochupz@gmail.com');

INSERT INTO produtos(produto_nome, produto_categoria, produto_preco, produto_estoque, produto_descricao)
VALUES ('bola de futebol', 'bolas', 100.00, 10, 'bola de futebol nike');

INSERT INTO movimento(cliente_id, movimento_data, movimento_valor)
VALUES (1, '20/08/2026', 100.00);

INSERT INTO item_movimento(movimento_id, produto_id, item_numero, item_quantidade, item_desconto, item_valor)
VALUES (1, 1, 1, 1, 10.0, 90.00);

SELECT * FROM clientes;
