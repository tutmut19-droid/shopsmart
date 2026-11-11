const products = [
  { id: 1, name: "Kenyan Coffee 1kg", price: 1200 },
  { id: 2, name: "Maasai Beaded Bracelet", price: 800 },
  { id: 3, name: "Kikoy Beach Towel", price: 1500 },
  { id: 4, name: "Wireless Earbuds", price: 2500 },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-3xl font-bold">ShopSmart</h1>
      <p className="mb-6 text-gray-600">Quality products across Africa</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {products.map((p) => (
          <div key={p.id} className="rounded-lg border p-4">
            <h2 className="font-semibold">{p.name}</h2>
            <p className="mb-3">KES {p.price}</p>
            <button className="rounded bg-black px-3 py-1 text-white">
              Add to cart
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}