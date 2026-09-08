import { useState, type ChangeEvent, type FormEvent } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/buttons/Button";
import { AdminSidebar } from "@/components/navigation/AdminSidebar";
import { Switch } from "@/components/forms/Switch";
import { SelectField } from "@/components/inputs/SelectField";
import { TextAreaField } from "@/components/inputs/TextAreaField";
import { TextField } from "@/components/inputs/TextField";
import trashIcon from "@/assets/lixeira-icon.png";
import "./styles.css";

type MockProduct = {
  id: number;
  name: string;
  category: string;
  price: string;
  quantity: number;
  available: boolean;
  observation?: string;
  imageUrl?: string;
};

type NewProductForm = {
  name: string;
  quantity: string;
  price: string;
  observation: string;
  category: string;
  imageUrl: string;
  available: boolean;
};

const emptyProductForm: NewProductForm = {
  name: "",
  quantity: "0",
  price: "",
  observation: "",
  category: "",
  imageUrl: "",
  available: true,
};

const productCategories = [
  "Lanches",
  "Pizzas",
  "Porções",
  "Bebidas",
  "Sobremesas",
];

const initialProducts: MockProduct[] = [
  {
    id: 1,
    name: "X-Burger artesanal",
    category: "Lanches",
    price: "R$ 28,90",
    quantity: 18,
    available: true,
  },
  {
    id: 2,
    name: "Pizza margherita",
    category: "Pizzas",
    price: "R$ 44,90",
    quantity: 12,
    available: true,
  },
  {
    id: 3,
    name: "Batata rústica",
    category: "Porções",
    price: "R$ 18,00",
    quantity: 0,
    available: false,
  },
  {
    id: 4,
    name: "Suco de laranja",
    category: "Bebidas",
    price: "R$ 12,00",
    quantity: 24,
    available: true,
  },
];

export default function Products() {
  const [activeItem, setActiveItem] = useState("menu");
  const [products, setProducts] = useState(initialProducts);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [newProduct, setNewProduct] =
    useState<NewProductForm>(emptyProductForm);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [productToDelete, setProductToDelete] = useState<MockProduct | null>(
    null,
  );

  const normalizedSearch = searchQuery.trim().toLocaleLowerCase("pt-BR");
  const filteredProducts = products.filter((product) => {
    const matchesSearch = `${product.name} ${product.category}`
      .toLocaleLowerCase("pt-BR")
      .includes(normalizedSearch);
    const matchesCategory =
      categoryFilter === "all" || product.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const updateAvailability = (productId: number, available: boolean) => {
    setProducts((currentProducts) =>
      currentProducts.map((product) =>
        product.id === productId ? { ...product, available } : product,
      ),
    );
  };

  const updateQuantity = (productId: number, quantity: number) => {
    setProducts((currentProducts) =>
      currentProducts.map((product) =>
        product.id === productId ? { ...product, quantity } : product,
      ),
    );
  };

  const closeProductModal = () => {
    setIsProductModalOpen(false);
    setEditingProductId(null);
    setNewProduct(emptyProductForm);
  };

  const openNewProduct = () => {
    setEditingProductId(null);
    setNewProduct(emptyProductForm);
    setIsProductModalOpen(true);
  };

  const openEditProduct = (product: MockProduct) => {
    setEditingProductId(product.id);
    setNewProduct({
      name: product.name,
      quantity: String(product.quantity),
      price: product.price
        .replaceAll(".", "")
        .replace(",", ".")
        .replace(/[^\d.]/g, ""),
      observation: product.observation ?? "",
      category: product.category,
      imageUrl: product.imageUrl ?? "",
      available: product.available,
    });
    setIsProductModalOpen(true);
  };

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      setNewProduct((current) => ({ ...current, imageUrl: "" }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setNewProduct((current) => ({
        ...current,
        imageUrl: typeof reader.result === "string" ? reader.result : "",
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProduct = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const quantity = Math.max(0, Number(newProduct.quantity));
    const price = Math.max(0, Number(newProduct.price));
    const formattedPrice = price.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

    setProducts((currentProducts) => {
      if (editingProductId !== null) {
        return currentProducts.map((product) =>
          product.id === editingProductId
            ? {
                ...product,
                name: newProduct.name.trim(),
                category: newProduct.category,
                price: formattedPrice,
                quantity,
                available: newProduct.available,
                observation: newProduct.observation.trim() || undefined,
                imageUrl: newProduct.imageUrl || undefined,
              }
            : product,
        );
      }

      const nextId =
        Math.max(0, ...currentProducts.map((product) => product.id)) + 1;
      return [
        ...currentProducts,
        {
          id: nextId,
          name: newProduct.name.trim(),
          category: newProduct.category,
          price: formattedPrice,
          quantity,
          available: newProduct.available,
          observation: newProduct.observation.trim() || undefined,
          imageUrl: newProduct.imageUrl || undefined,
        },
      ];
    });

    closeProductModal();
  };

  const requestProductDeletion = (product: MockProduct) => {
    closeProductModal();
    setProductToDelete(product);
  };

  const confirmProductDeletion = () => {
    if (!productToDelete) return;

    setProducts((currentProducts) =>
      currentProducts.filter((product) => product.id !== productToDelete.id),
    );
    setProductToDelete(null);
  };

  return (
    <div className="products-page">
      <AdminSidebar
        activeId={activeItem}
        onChange={setActiveItem}
        userName="Nome do usuário"
        userRole="Administrador"
      />

      <main className="products-content">
        <div className="products-topbar">
          <header className="products-heading">
            <span>Cardápio</span>
            <h1>PRODUTOS</h1>
            <p>Controle disponibilidade, preço e destaque para o cliente.</p>
          </header>
          <div className="products-topbar-actions">
            <label className="product-search">
              <Search aria-hidden="true" />
              <input
                type="search"
                aria-label="Pesquisar produto"
                placeholder="Pesquisar produto"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </label>
            <label className="product-category-filter">
              <span className="visually-hidden">Filtrar por categoria</span>
              <select
                aria-label="Filtrar por categoria"
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
              >
                <option value="all">Todas as categorias</option>
                {productCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <Button onClick={openNewProduct}>
              <Plus aria-hidden="true" />
              Novo produto
            </Button>
          </div>
        </div>

        <section
          className="products-list"
          aria-labelledby="products-list-title"
        >
          <div className="products-list-heading">
            <div>
              <h2 id="products-list-title">Itens do cardápio</h2>
              <p>
                {normalizedSearch || categoryFilter !== "all"
                  ? `${filteredProducts.length} de ${products.length} produtos`
                  : `${products.length} produtos cadastrados`}
              </p>
            </div>
          </div>

          <div className="products-list-body">
            {filteredProducts.map((product) => (
              <article className="product-row" key={product.id}>
                <div className="product-identity">
                  <span className="product-initial" aria-hidden="true">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt="" />
                    ) : (
                      product.name.charAt(0)
                    )}
                  </span>
                  <div>
                    <h3>{product.name}</h3>
                    <p>{product.category}</p>
                  </div>
                </div>

                <strong className="product-price">{product.price}</strong>

                <div className="product-controls">
                  <TextField
                    className="product-quantity"
                    id={`product-quantity-${product.id}`}
                    label="Quantidade"
                    type="number"
                    min={0}
                    value={product.quantity}
                    onChange={(event) =>
                      updateQuantity(
                        product.id,
                        Math.max(0, Number(event.target.value)),
                      )
                    }
                  />
                  <Switch
                    className={`product-status ${product.available ? "is-active" : "is-inactive"}`}
                    label={product.available ? "Ativo" : "Inativo"}
                    checked={product.available}
                    onChange={(event) =>
                      updateAvailability(product.id, event.target.checked)
                    }
                  />
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => openEditProduct(product)}
                  >
                    Editar
                  </Button>
                  <button
                    type="button"
                    className="product-delete-button"
                    aria-label={`Excluir ${product.name}`}
                    onClick={() => setProductToDelete(product)}
                  >
                    <img src={trashIcon} alt="" />
                  </button>
                </div>
              </article>
            ))}
            {filteredProducts.length === 0 && (
              <p className="products-no-results">
                Nenhum produto encontrado com os filtros selecionados.
              </p>
            )}
          </div>
        </section>
      </main>

      {isProductModalOpen && (
        <div
          className="product-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeProductModal();
          }}
        >
          <section
            className="product-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-form-title"
          >
            <header className="product-modal-heading">
              <div>
                <h2 id="product-form-title">
                  {editingProductId === null
                    ? "Novo produto"
                    : "Editar produto"}
                </h2>
                <p>
                  {editingProductId === null
                    ? "Preencha as informações que serão exibidas no cardápio."
                    : "Atualize as informações do produto selecionado."}
                </p>
              </div>
              <button
                type="button"
                className="product-modal-close"
                aria-label="Fechar"
                onClick={closeProductModal}
              >
                ×
              </button>
            </header>

            <form className="new-product-form" onSubmit={handleSaveProduct}>
              <TextField
                className="new-product-name"
                label="Nome do produto"
                autoFocus
                required
                value={newProduct.name}
                onChange={(event) =>
                  setNewProduct((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />

              <TextField
                label="Quantidade"
                type="number"
                min={0}
                required
                value={newProduct.quantity}
                onChange={(event) =>
                  setNewProduct((current) => ({
                    ...current,
                    quantity: event.target.value,
                  }))
                }
              />

              <TextField
                label="Preço"
                type="number"
                min={0}
                step="0.01"
                placeholder="0,00"
                required
                value={newProduct.price}
                onChange={(event) =>
                  setNewProduct((current) => ({
                    ...current,
                    price: event.target.value,
                  }))
                }
              />

              <SelectField
                className="new-product-category"
                label="Categoria"
                required
                value={newProduct.category}
                onChange={(event) =>
                  setNewProduct((current) => ({
                    ...current,
                    category: event.target.value,
                  }))
                }
              >
                <option value="" disabled>
                  Selecione uma categoria
                </option>
                {productCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </SelectField>

              <div className="new-product-status-field">
                <span>Status</span>
                <Switch
                  className={`product-status ${newProduct.available ? "is-active" : "is-inactive"}`}
                  label={newProduct.available ? "Ativo" : "Inativo"}
                  checked={newProduct.available}
                  onChange={(event) =>
                    setNewProduct((current) => ({
                      ...current,
                      available: event.target.checked,
                    }))
                  }
                />
              </div>

              <TextAreaField
                className="new-product-observation"
                label="Observação"
                placeholder="Ingredientes, restrições ou detalhes do produto"
                value={newProduct.observation}
                onChange={(event) =>
                  setNewProduct((current) => ({
                    ...current,
                    observation: event.target.value,
                  }))
                }
              />

              <div className="new-product-photo">
                <TextField
                  label="Foto (opcional)"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handlePhotoChange}
                />
                {newProduct.imageUrl && (
                  <img src={newProduct.imageUrl} alt="Prévia do produto" />
                )}
              </div>

              <footer className="product-modal-actions">
                {editingProductId !== null && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="product-delete-action"
                    onClick={() => {
                      const product = products.find(
                        (item) => item.id === editingProductId,
                      );
                      if (product) requestProductDeletion(product);
                    }}
                  >
                    <img className="button-trash-icon" src={trashIcon} alt="" />
                    Excluir produto
                  </Button>
                )}
                <div className="product-modal-save-actions">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={closeProductModal}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingProductId === null
                      ? "Cadastrar produto"
                      : "Salvar alterações"}
                  </Button>
                </div>
              </footer>
            </form>
          </section>
        </div>
      )}

      {productToDelete && (
        <div
          className="product-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setProductToDelete(null);
          }}
        >
          <section
            className="product-delete-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-product-title"
            aria-describedby="delete-product-description"
          >
            <div className="product-delete-dialog-icon" aria-hidden="true">
              <img src={trashIcon} alt="" />
            </div>
            <h2 id="delete-product-title">Excluir produto?</h2>
            <p id="delete-product-description">
              “{productToDelete.name}” será removido da lista. Esta ação não
              poderá ser desfeita.
            </p>
            <footer>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setProductToDelete(null)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={confirmProductDeletion}
              >
                Excluir
              </Button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
