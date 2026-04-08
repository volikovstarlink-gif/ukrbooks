export default function CategoryPage({ params }: { params: { slug: string } }) {
  return <main><h1>Категорія: {params.slug}</h1></main>;
}
