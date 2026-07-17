import { useLayoutEffect, useRef } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Product } from "@/types";
import { formatPrice } from "@/lib/format";

gsap.registerPlugin(ScrollTrigger);

/* 21st.dev "executive impact" carousel, adapted to LOOK: brand palette + Playfair,
   real products, product→model image swap on hover, cards link to the PDP.
   The original pins columns and scroll-jacks the page; to compose cleanly inside
   the multi-section Home this uses a non-pinning parallax drift on alternating
   columns instead (respects prefers-reduced-motion). */

const styles = `
  .products-carousel {
    background-color: var(--color-page, #fdfdfe);
    color: var(--color-ink, #0a0a0a);
    margin: 0;
    overflow-x: hidden;
  }
  .col-scroll {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    justify-items: center;
    width: 90vw;
    max-width: 1338px;
    margin: 0 auto;
    box-sizing: border-box;
  }
  @media (max-width: 768px) {
    .col-scroll { display: flex; flex-direction: column; width: 100%; gap: 5vh; align-items: center; }
  }
  .col-scroll__box { display: flex; flex-direction: column; padding: 6vh 0; }
  .col-scroll__box--odd { flex-direction: column-reverse; margin-top: 10vh; }
  @media (max-width: 768px) {
    .col-scroll__box--odd { flex-direction: column; margin-top: 0; padding: 0; }
    .col-scroll__box { width: 100%; align-items: center; padding: 0; }
  }
  .col-scroll__list { display: flex; flex-direction: column; will-change: transform; gap: 7vh; }
  .col-scroll__box--odd .col-scroll__list { flex-direction: column-reverse; }
  @media (max-width: 768px) {
    .col-scroll__box--odd .col-scroll__list { flex-direction: column; }
    .col-scroll__list { gap: 6vh; }
  }
  .product-card {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    width: 22vw; background: transparent; cursor: pointer; text-decoration: none;
    -webkit-tap-highlight-color: transparent;
  }
  @media (max-width: 768px) {
    .product-card { width: 84vw; margin: 0 0 6vh 0; }
    .product-card:last-child { margin-bottom: 0; }
  }
  .col-scroll__img-wrapper {
    position: relative; aspect-ratio: 0.8; width: 100%; overflow: hidden;
    border: 1px solid var(--color-line, #e8e8e8); padding: 1rem; background: #fff;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
    display: flex; justify-content: center; align-items: center; border-radius: 8px;
  }
  .col-scroll__img-wrapper img {
    position: absolute; top: 1rem; left: 1rem; right: 1rem; bottom: 1rem;
    width: calc(100% - 2rem); height: calc(100% - 2rem);
    object-fit: cover; object-position: top; transition: opacity 0.5s ease-in-out;
  }
  .product-img { z-index: 1; opacity: 1; }
  .model-img { z-index: 2; opacity: 0; }
  .product-card:hover .product-img, .product-card:focus-visible .product-img { opacity: 0; }
  .product-card:hover .model-img, .product-card:focus-visible .model-img { opacity: 1; }
  .product-card__info {
    position: absolute; bottom: 2rem; left: 0; width: 100%; text-align: center; z-index: 3;
    padding: 0 1.5rem; box-sizing: border-box; transition: opacity 0.4s ease, transform 0.4s ease;
  }
  .product-card:hover .product-card__info, .product-card:focus-visible .product-card__info {
    opacity: 0; transform: translateY(10px);
  }
  .product-card__title {
    margin: 0 0 0.5rem; font-family: 'Playfair Display', serif; font-weight: 500;
    font-size: 1.2rem; line-height: 1.3; color: var(--color-ink, #0a0a0a);
    text-shadow: 0 2px 10px rgba(255, 255, 255, 0.85);
  }
  .product-card__price-wrapper { font-family: 'Playfair Display', serif; font-size: 1.05rem; letter-spacing: 0.5px; }
  .product-card__price--old { text-decoration: line-through; opacity: 0.5; margin-right: 0.5rem; }
  .product-card__price { color: var(--color-accent, #4402d3); }
  .product-card__btn {
    position: absolute; bottom: 2rem; left: 50%; transform: translateX(-50%) translateY(20px);
    z-index: 4; opacity: 0; background: rgba(255,255,255,0.95); border: 1px solid var(--color-ink, #0a0a0a);
    padding: 0.9rem 1.8rem; font-family: 'Playfair Display', serif; text-transform: uppercase;
    letter-spacing: 2px; font-size: 0.75rem; font-weight: 600; transition: all 0.4s ease;
    white-space: nowrap; color: var(--color-ink, #0a0a0a); border-radius: 6px;
  }
  .product-card:hover .product-card__btn, .product-card:focus-visible .product-card__btn {
    opacity: 1; transform: translateX(-50%) translateY(0);
  }
  .product-card__btn:hover { background: var(--color-ink, #0a0a0a); color: #fff; }
  @media (max-width: 768px) {
    .product-card__title { font-size: 1.1rem; }
    .product-card__price-wrapper { font-size: 1rem; }
    .product-card__btn { padding: 0.7rem 1.4rem; font-size: 0.7rem; }
  }
`;

export default function ExecutiveImpactCarousel({ products }: { products: Product[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  const per = Math.ceil(products.length / 3);
  const columns = [products.slice(0, per), products.slice(per, per * 2), products.slice(per * 2)];

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || products.length === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const mm = gsap.matchMedia();
    mm.add("(min-width: 769px)", () => {
      const ctx = gsap.context(() => {
        // Subtle counter-scroll parallax on alternating columns — no pinning.
        gsap.utils.toArray<HTMLElement>(".col-scroll__list").forEach((el, i) => {
          gsap.fromTo(
            el,
            { yPercent: i % 2 === 0 ? 6 : -4 },
            {
              yPercent: i % 2 === 0 ? -6 : 4,
              ease: "none",
              scrollTrigger: {
                trigger: container,
                start: "top bottom",
                end: "bottom top",
                scrub: true,
              },
            },
          );
        });
      }, container);
      return () => ctx.revert();
    });

    return () => mm.revert();
  }, [products.length]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <div className="products-carousel">
        <div ref={containerRef} className="col-scroll">
          {columns.map((col, i) => (
            <div key={i} className={`col-scroll__box${i % 2 === 0 ? " col-scroll__box--odd" : ""}`}>
              <div className="col-scroll__list">
                {col.map((p) => (
                  <CarouselCard key={p.id} product={p} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function CarouselCard({ product }: { product: Product }) {
  const prod = product.images[0] ?? "";
  const model = product.images[1] ?? prod;
  return (
    <Link to={`/shop/${product.slug}`} className="product-card" aria-label={product.name}>
      <div className="col-scroll__img-wrapper">
        <img className="product-img" src={prod} alt={product.name} loading="lazy" />
        <img className="model-img" src={model} alt="" loading="lazy" />

        <div className="product-card__info">
          <h3 className="product-card__title">{product.name}</h3>
          <div className="product-card__price-wrapper">
            {product.mrp && (
              <span className="product-card__price--old">
                {formatPrice(product.mrp, product.currencyCode)}
              </span>
            )}
            <span className="product-card__price">
              {formatPrice(product.price, product.currencyCode)}
            </span>
          </div>
        </div>

        <span className="product-card__btn">View Details +</span>
      </div>
    </Link>
  );
}
