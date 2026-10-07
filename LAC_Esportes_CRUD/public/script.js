/* ============================================================
   LAC ESPORTES - FRONT-END INTEGRADO COM SQLITE
   ============================================================ */

let produtos = [];
let clientes = [];
let carrinho = JSON.parse(localStorage.getItem("lacCarrinho")) || [];

let imagemSelecionada = "";
let clienteEditando = null;
let produtoEditando = null;

const API = "/api";

function salvarCarrinho() {
  localStorage.setItem("lacCarrinho", JSON.stringify(carrinho));
}

function formatarPreco(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

async function api(url, options = {}) {
  const config = { ...options, headers: { ...(options.headers || {}) } };

  if (options.body && typeof options.body !== "string") {
    config.headers["Content-Type"] = "application/json";
    config.body = JSON.stringify(options.body);
  }

  const resposta = await fetch(API + url, config);
  const texto = await resposta.text();

  let dados = {};
  try {
    dados = texto ? JSON.parse(texto) : {};
  } catch {
    dados = { erro: texto };
  }

  if (!resposta.ok) {
    throw new Error(dados.erro || "Erro na comunicação com o servidor.");
  }

  return dados;
}

/* ============================================================
   NAVEGAÇÃO
   ============================================================ */

function abrirAba(nomeAba) {
  document.querySelectorAll(".aba").forEach(aba => aba.classList.remove("ativa"));
  document.querySelectorAll(".menu-btn").forEach(botao => botao.classList.remove("ativo"));

  const aba = document.getElementById(nomeAba);
  if (aba) aba.classList.add("ativa");

  const botao = document.querySelector(`[data-aba="${nomeAba}"]`);
  if (botao) botao.classList.add("ativo");

  window.scrollTo({ top: 0, behavior: "smooth" });

  if (nomeAba === "vendas") renderizarProdutos();
  if (nomeAba === "carrinho") atualizarCarrinho();
}

/* ============================================================
   CLIENTES - CRUD
   ============================================================ */

async function carregarClientes() {
  clientes = await api("/clientes");
  renderizarClientes();
}

function limparFormularioCliente() {
  const form = document.getElementById("formCliente");
  form.reset();
  clienteEditando = null;

  const botao = form.querySelector('button[type="submit"]');
  if (botao) botao.textContent = "Salvar cliente";

  const aviso = document.getElementById("avisoCliente");
  if (aviso) aviso.textContent = "";
}

function preencherCliente(cliente) {
  const form = document.getElementById("formCliente");

  const campos = {
    nome: cliente.cliente_nome,
    cpf: cliente.cliente_cpf,
    telefone: cliente.cliente_telefone,
    email: cliente.cliente_email,
    cep: cliente.cliente_cep,
    logradouro: cliente.cliente_logradouro,
    numero: cliente.cliente_numero_residencia,
    bairro: cliente.cliente_bairro,
    cidade: cliente.cliente_cidade,
    uf: cliente.cliente_uf
  };

  Object.entries(campos).forEach(([nome, valor]) => {
    const campo = form.elements[nome];
    if (campo) campo.value = valor ?? "";
  });

  clienteEditando = cliente.cliente_id;

  const botao = form.querySelector('button[type="submit"]');
  if (botao) botao.textContent = "Atualizar cliente";

  document.getElementById("avisoCliente").textContent =
    "Editando cliente #" + cliente.cliente_id + ".";
  abrirAba("clientes");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.getElementById("formCliente").addEventListener("submit", async function(event) {
  event.preventDefault();

  const dados = new FormData(this);
  const cliente = {
    cliente_nome: dados.get("nome")?.trim(),
    cliente_cpf: dados.get("cpf")?.trim(),
    cliente_telefone: dados.get("telefone")?.trim(),
    cliente_email: dados.get("email")?.trim(),
    cliente_cep: dados.get("cep")?.trim(),
    cliente_logradouro: dados.get("logradouro")?.trim(),
    cliente_numero_residencia: dados.get("numero")?.trim(),
    cliente_bairro: dados.get("bairro")?.trim(),
    cliente_cidade: dados.get("cidade")?.trim(),
    cliente_uf: dados.get("uf")?.trim().toUpperCase()
  };

  if (Object.values(cliente).some(v => !v)) {
    document.getElementById("avisoCliente").textContent =
      "Preencha todos os campos do cliente.";
    return;
  }

  try {
    if (clienteEditando) {
      await api(`/clientes/${clienteEditando}`, {
        method: "PUT",
        body: cliente
      });
      document.getElementById("avisoCliente").textContent =
        "Cliente atualizado com sucesso!";
    } else {
      await api("/clientes", {
        method: "POST",
        body: cliente
      });
      document.getElementById("avisoCliente").textContent =
        "Cliente cadastrado com sucesso!";
    }

    limparFormularioCliente();
    await carregarClientes();
  } catch (erro) {
    document.getElementById("avisoCliente").textContent = erro.message;
  }
});

function renderizarClientes() {
  const corpo = document.getElementById("corpoTabelaClientes");
  if (!corpo) return;

  corpo.innerHTML = "";

  if (clientes.length === 0) {
    corpo.innerHTML = `
      <tr>
        <td colspan="6">Nenhum cliente cadastrado.</td>
      </tr>`;
    return;
  }

  clientes.forEach(cliente => {
    const linha = document.createElement("tr");
    linha.innerHTML = `
      <td>${cliente.cliente_id}</td>
      <td>${escapeHtml(cliente.cliente_nome)}</td>
      <td>${escapeHtml(cliente.cliente_telefone)}</td>
      <td>${escapeHtml(cliente.cliente_email)}</td>
      <td>${escapeHtml(cliente.cliente_cidade)} ${escapeHtml(cliente.cliente_uf)}</td>
      <td>
        <button class="btn-editar" onclick="editarCliente(${cliente.cliente_id})">Editar</button>
        <button class="btn-excluir" onclick="excluirCliente(${cliente.cliente_id})">Excluir</button>
      </td>`;
    corpo.appendChild(linha);
  });
}

function editarCliente(id) {
  const cliente = clientes.find(c => c.cliente_id === id);
  if (cliente) preencherCliente(cliente);
}

async function excluirCliente(id) {
  if (!confirm("Deseja excluir este cliente? As vendas relacionadas também serão excluídas conforme o banco de dados.")) {
    return;
  }

  try {
    await api(`/clientes/${id}`, { method: "DELETE" });
    await carregarClientes();
  } catch (erro) {
    alert(erro.message);
  }
}

/* ============================================================
   PRODUTOS - CRUD
   ============================================================ */

async function carregarProdutos() {
  produtos = await api("/produtos");
  renderizarProdutosTabela();
  renderizarProdutos();
  limparCarrinhoDeProdutosInexistentes();
}

function limparFormularioProduto() {
  const form = document.getElementById("formProduto");
  form.reset();
  imagemSelecionada = "";
  produtoEditando = null;

  const preview = document.getElementById("previewImagem");
  if (preview) preview.innerHTML = "";

  const botao = form.querySelector('button[type="submit"]');
  if (botao) botao.textContent = "Cadastrar produto";

  const aviso = document.getElementById("avisoProduto");
  if (aviso) aviso.textContent = "";
}

function preencherProduto(produto) {
  const form = document.getElementById("formProduto");

  form.elements["nome"].value = produto.produto_nome || "";
  form.elements["categoria"].value = produto.produto_categoria || "";
  form.elements["preco"].value = produto.produto_preco ?? "";
  form.elements["estoque"].value = produto.produto_estoque ?? "";
  form.elements["descricao"].value = produto.produto_descricao || "";

  imagemSelecionada = produto.produto_imagem || "";

  document.getElementById("previewImagem").innerHTML = imagemSelecionada
    ? `<img src="${imagemSelecionada}" alt="Prévia do produto">`
    : "";

  produtoEditando = produto.produto_id;

  const botao = form.querySelector('button[type="submit"]');
  if (botao) botao.textContent = "Atualizar produto";

  document.getElementById("avisoProduto").textContent =
    "Editando produto #" + produto.produto_id + ".";

  abrirAba("produtos");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

const inputImagem = document.getElementById("imagemProduto");

if (inputImagem) {
  inputImagem.addEventListener("change", function(event) {
    const arquivo = event.target.files[0];

    if (!arquivo) {
      imagemSelecionada = "";
      document.getElementById("previewImagem").innerHTML = "";
      return;
    }

    if (!arquivo.type.startsWith("image/")) {
      alert("Selecione um arquivo de imagem.");
      inputImagem.value = "";
      return;
    }

    const leitor = new FileReader();

    leitor.onload = function(e) {
      imagemSelecionada = e.target.result;
      document.getElementById("previewImagem").innerHTML =
        `<img src="${imagemSelecionada}" alt="Prévia do produto">`;
    };

    leitor.readAsDataURL(arquivo);
  });
}

document.getElementById("formProduto").addEventListener("submit", async function(event) {
  event.preventDefault();

  const dados = new FormData(this);

  const produto = {
    produto_nome: dados.get("nome")?.trim(),
    produto_categoria: dados.get("categoria"),
    produto_preco: Number(dados.get("preco")),
    produto_estoque: Number(dados.get("estoque")),
    produto_descricao: dados.get("descricao")?.trim() || "Produto de futebol LAC Esportes.",
    produto_imagem: imagemSelecionada || ""
  };

  if (!produto.produto_nome || !produto.produto_categoria ||
      Number.isNaN(produto.produto_preco) || produto.produto_estoque < 0) {
    document.getElementById("avisoProduto").textContent =
      "Preencha corretamente os dados do produto.";
    return;
  }

  try {
    if (produtoEditando) {
      await api(`/produtos/${produtoEditando}`, {
        method: "PUT",
        body: produto
      });
      document.getElementById("avisoProduto").textContent =
        "Produto atualizado com sucesso!";
    } else {
      await api("/produtos", {
        method: "POST",
        body: produto
      });
      document.getElementById("avisoProduto").textContent =
        "Produto cadastrado com sucesso!";
    }

    limparFormularioProduto();
    await carregarProdutos();
  } catch (erro) {
    document.getElementById("avisoProduto").textContent = erro.message;
  }
});

function renderizarProdutosTabela() {
  const corpo = document.getElementById("corpoTabelaProdutos");
  if (!corpo) return;

  corpo.innerHTML = "";

  if (produtos.length === 0) {
    corpo.innerHTML = `
      <tr>
        <td colspan="7">Nenhum produto cadastrado.</td>
      </tr>`;
    return;
  }

  produtos.forEach(produto => {
    const linha = document.createElement("tr");

    const imagem = produto.produto_imagem
      ? `<img class="imagem-tabela" src="${produto.produto_imagem}" alt="${escapeHtml(produto.produto_nome)}">`
      : "⚽";

    linha.innerHTML = `
      <td>${imagem}</td>
      <td>${produto.produto_id}</td>
      <td>${escapeHtml(produto.produto_nome)}</td>
      <td>${escapeHtml(produto.produto_categoria)}</td>
      <td>${formatarPreco(produto.produto_preco)}</td>
      <td>${produto.produto_estoque}</td>
      <td>
        <button class="btn-editar" onclick="editarProduto(${produto.produto_id})">Editar</button>
        <button class="btn-excluir" onclick="excluirProduto(${produto.produto_id})">Excluir</button>
      </td>`;

    corpo.appendChild(linha);
  });
}

function editarProduto(id) {
  const produto = produtos.find(p => p.produto_id === id);
  if (produto) preencherProduto(produto);
}

async function excluirProduto(id) {
  if (!confirm("Deseja excluir este produto? Os itens de movimento relacionados também serão excluídos conforme o banco.")) {
    return;
  }

  try {
    await api(`/produtos/${id}`, { method: "DELETE" });

    carrinho = carrinho.filter(item => item.id !== id);
    salvarCarrinho();

    await carregarProdutos();
    atualizarCarrinho();
  } catch (erro) {
    alert(erro.message);
  }
}

/* ============================================================
   VITRINE
   ============================================================ */

function renderizarProdutos() {
  const vitrine = document.getElementById("vitrine");
  if (!vitrine) return;

  const busca = document.getElementById("buscaProduto")?.value.toLowerCase() || "";
  const categoria = document.getElementById("filtroCategoria")?.value || "todos";

  vitrine.innerHTML = "";

  const filtrados = produtos.filter(produto => {
    const combinaBusca =
      produto.produto_nome.toLowerCase().includes(busca) ||
      produto.produto_categoria.toLowerCase().includes(busca);

    const combinaCategoria =
      categoria === "todos" || produto.produto_categoria === categoria;

    return combinaBusca && combinaCategoria;
  });

  if (filtrados.length === 0) {
    vitrine.innerHTML = `
      <div class="painel">
        <h3>Nenhum produto encontrado.</h3>
        <p>Cadastre um produto na aba "Produtos" para ele aparecer aqui.</p>
      </div>`;
    return;
  }

  filtrados.forEach(produto => {
    const card = document.createElement("div");
    card.className = "produto-card";

    const imagem = produto.produto_imagem
      ? `<img src="${produto.produto_imagem}" alt="${escapeHtml(produto.produto_nome)}">`
      : `<span class="sem-imagem">⚽</span>`;

    const semEstoque = produto.produto_estoque <= 0;

    card.innerHTML = `
      <div class="produto-imagem">${imagem}</div>

      <div class="produto-info">
        <div class="produto-categoria">${escapeHtml(produto.produto_categoria)}</div>

        <div class="produto-nome">${escapeHtml(produto.produto_nome)}</div>

        <div class="produto-descricao">
          ${escapeHtml(produto.produto_descricao || "Produto de futebol LAC Esportes.")}
        </div>

        <div class="produto-preco">${formatarPreco(produto.produto_preco)}</div>

        <div class="produto-estoque">
          ${semEstoque
            ? "Produto esgotado"
            : `${produto.produto_estoque} unidade(s) em estoque`}
        </div>

        <button class="botao-comprar"
          ${semEstoque ? "disabled" : ""}
          onclick="adicionarCarrinho(${produto.produto_id})">
          ${semEstoque ? "Esgotado" : "Adicionar ao carrinho"}
        </button>
      </div>`;

    vitrine.appendChild(card);
  });
}

document.getElementById("buscaProduto")?.addEventListener("input", renderizarProdutos);
document.getElementById("filtroCategoria")?.addEventListener("change", renderizarProdutos);

/* ============================================================
   CARRINHO
   ============================================================ */

function adicionarCarrinho(id) {
  const produto = produtos.find(p => p.produto_id === id);

  if (!produto) return;

  if (produto.produto_estoque <= 0) {
    alert("Este produto está esgotado.");
    return;
  }

  const item = carrinho.find(i => i.id === id);

  if (item) {
    if (item.quantidade < produto.produto_estoque) {
      item.quantidade++;
    } else {
      alert("Você atingiu o limite de estoque.");
      return;
    }
  } else {
    carrinho.push({ id, quantidade: 1 });
  }

  salvarCarrinho();
  atualizarCarrinho();
  abrirAreaCarrinho();
}

function atualizarCarrinho() {
  const quantidade = carrinho.reduce((total, item) => total + item.quantidade, 0);

  const contador = document.getElementById("contadorCarrinho");
  const contadorMenu = document.getElementById("contadorMenuCarrinho");
  const totalCarrinho = document.getElementById("totalCarrinho");

  if (contador) contador.textContent = quantidade;
  if (contadorMenu) contadorMenu.textContent = quantidade;
  if (totalCarrinho) totalCarrinho.textContent = quantidade;

  const area = document.getElementById("itensCarrinho");
  const areaPagina = document.getElementById("itensCarrinhoPagina");

  if (area) area.innerHTML = "";
  if (areaPagina) areaPagina.innerHTML = "";

  let total = 0;

  carrinho.forEach(item => {
    const produto = produtos.find(p => p.produto_id === item.id);
    if (!produto) return;

    const subtotal = produto.produto_preco * item.quantidade;
    total += subtotal;

    if (area) {
      const div = document.createElement("div");
      div.className = "item-carrinho";

      div.innerHTML = `
        ${produto.produto_imagem
          ? `<img src="${produto.produto_imagem}" alt="${escapeHtml(produto.produto_nome)}">`
          : `<span>⚽</span>`}

        <div class="item-info">
          <strong>${escapeHtml(produto.produto_nome)}</strong>
          <span>${item.quantidade} x ${formatarPreco(produto.produto_preco)}</span>
        </div>

        <strong>${formatarPreco(subtotal)}</strong>`;
      area.appendChild(div);
    }

    if (areaPagina) {
      const div = document.createElement("div");
      div.className = "item-carrinho-pagina";

      const imagem = produto.produto_imagem
        ? `<img src="${produto.produto_imagem}" alt="${escapeHtml(produto.produto_nome)}">`
        : `<div class="produto-imagem"><span class="sem-imagem">⚽</span></div>`;

      div.innerHTML = `
        ${imagem}

        <div class="item-carrinho-pagina-info">
          <h3>${escapeHtml(produto.produto_nome)}</h3>
          <p>${escapeHtml(produto.produto_categoria)}</p>
          <p>${formatarPreco(produto.produto_preco)} por unidade</p>

          <div class="quantidade-controle">
            <button onclick="alterarQuantidade(${produto.produto_id}, -1)">−</button>
            <span>${item.quantidade}</span>
            <button onclick="alterarQuantidade(${produto.produto_id}, 1)">+</button>
          </div>
        </div>

        <div>
          <div class="item-carrinho-pagina-preco">${formatarPreco(subtotal)}</div>
          <button class="remover-item" onclick="removerCarrinho(${produto.produto_id})">
            Remover
          </button>
        </div>`;
      areaPagina.appendChild(div);
    }
  });

  if (areaPagina && carrinho.length === 0) {
    areaPagina.innerHTML = `
      <div class="carrinho-vazio">
        <div class="icone">🛒</div>
        <h3>Seu carrinho está vazio</h3>
        <p>Adicione produtos de futebol para começar sua compra.</p>
        <button class="botao-principal" onclick="abrirAba('vendas')">
          Ver produtos
        </button>
      </div>`;
  }

  const valorTotal = document.getElementById("valorTotal");
  const quantidadeResumo = document.getElementById("quantidadeResumo");
  const subtotalResumo = document.getElementById("subtotalResumo");
  const totalResumo = document.getElementById("totalResumo");

  if (valorTotal) valorTotal.textContent = formatarPreco(total);
  if (quantidadeResumo) quantidadeResumo.textContent = quantidade;
  if (subtotalResumo) subtotalResumo.textContent = formatarPreco(total);
  if (totalResumo) totalResumo.textContent = formatarPreco(total);
}

function alterarQuantidade(id, quantidade) {
  const item = carrinho.find(i => i.id === id);
  const produto = produtos.find(p => p.produto_id === id);

  if (!item || !produto) return;

  item.quantidade += quantidade;

  if (item.quantidade <= 0) {
    removerCarrinho(id);
    return;
  }

  if (item.quantidade > produto.produto_estoque) {
    item.quantidade = produto.produto_estoque;
    alert("Você atingiu o limite de estoque disponível.");
  }

  salvarCarrinho();
  atualizarCarrinho();
  renderizarProdutos();
}

function removerCarrinho(id) {
  carrinho = carrinho.filter(item => item.id !== id);
  salvarCarrinho();
  atualizarCarrinho();
  renderizarProdutos();
}

function limparCarrinhoDeProdutosInexistentes() {
  const ids = new Set(produtos.map(p => p.produto_id));
  const novoCarrinho = carrinho.filter(item => ids.has(item.id));

  if (novoCarrinho.length !== carrinho.length) {
    carrinho = novoCarrinho;
    salvarCarrinho();
  }
}

function abrirAreaCarrinho() {
  document.getElementById("areaCarrinho")?.classList.add("aberto");
}

function fecharCarrinho() {
  document.getElementById("areaCarrinho")?.classList.remove("aberto");
}

/* ============================================================
   FINALIZAÇÃO DA COMPRA -> movimento + item_movimento
   ============================================================ */

async function finalizarCompra() {
  if (carrinho.length === 0) {
    alert("Seu carrinho está vazio.");
    return;
  }

  if (clientes.length === 0) {
    alert("Cadastre pelo menos um cliente antes de finalizar a compra.");
    abrirAba("clientes");
    return;
  }

  const lista = clientes
    .map(c => `${c.cliente_id} - ${c.cliente_nome} (${c.cliente_cpf})`)
    .join("\n");

  const resposta = prompt(
    "Digite o ID do cliente para esta venda:\n\n" + lista
  );

  if (resposta === null) return;

  const clienteId = Number(resposta);
  const cliente = clientes.find(c => c.cliente_id === clienteId);

  if (!cliente) {
    alert("Cliente não encontrado.");
    return;
  }

  try {
    const resultado = await api("/movimentos", {
      method: "POST",
      body: {
        cliente_id: clienteId,
        items: carrinho.map(item => ({
          produto_id: item.id,
          quantidade: item.quantidade,
          desconto: 0
        }))
      }
    });

    carrinho = [];
    salvarCarrinho();

    await carregarProdutos();
    await carregarClientes();
    atualizarCarrinho();

    alert(
      `Compra registrada com sucesso!\n\n` +
      `Venda: #${resultado.movimento_id}\n` +
      `Cliente: ${cliente.cliente_nome}\n` +
      `Total: ${formatarPreco(resultado.movimento_valor)}`
    );

    abrirAba("vendas");
  } catch (erro) {
    alert("Não foi possível finalizar a compra:\n" + erro.message);
  }
}

/* ============================================================
   SEGURANÇA BÁSICA DE HTML
   ============================================================ */

function escapeHtml(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* ============================================================
   INICIALIZAÇÃO
   ============================================================ */

async function inicializar() {
  try {
    await Promise.all([
      carregarClientes(),
      carregarProdutos()
    ]);

    atualizarCarrinho();
  } catch (erro) {
    console.error(erro);
    alert("Não foi possível conectar ao banco de dados. Verifique se o servidor está executando.");
  }
}

inicializar();
