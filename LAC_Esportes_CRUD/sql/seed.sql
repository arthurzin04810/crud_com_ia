-- Dados de exemplo fornecidos no projeto.
INSERT OR IGNORE INTO clientes (
    cliente_cpf, cliente_telefone, cliente_nome, cliente_bairro,
    cliente_cidade, cliente_uf, cliente_logradouro,
    cliente_numero_residencia, cliente_cep, cliente_email
) VALUES (
    '68732086040', '45998480808', 'Luis', 'Vila Adriana',
    'Foz do Iguaçu', 'Paraná', 'av. Ayrtonn Senna',
    '2911', '8446322', 'luiseduardochupz@gmail.com'
);

INSERT INTO produtos (
    produto_nome, produto_categoria, produto_preco,
    produto_estoque, produto_descricao
) VALUES (
    'bola de futebol', 'bolas', 100.00, 10,
    'bola de futebol nike'
);
