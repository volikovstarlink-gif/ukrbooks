export default function BookPage({ params }: { params: { slug: string } }) {
  return <main><h1>Книга: {params.slug}</h1></main>;
}
