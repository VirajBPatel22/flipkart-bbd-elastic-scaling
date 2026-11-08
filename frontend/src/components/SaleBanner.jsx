function SaleBanner() {
  return (
    <section className="sale-banner" aria-label="Promotional banner">
      <div className="sale-banner__content">
        <p className="sale-banner__eyebrow">IT457 Cloud Computing Project</p>
        <h1 className="sale-banner__title">Big Billion Days — Elastic Scaling Demo</h1>
        <p className="sale-banner__subtitle">
          A classroom proof of concept inspired by Flipkart's Big Billion
          Days sale, built to demonstrate AWS load balancing and automatic
          backend scaling. All products below are fictional demo data
          served by our own Node.js API.
        </p>
      </div>
    </section>
  );
}

export default SaleBanner;
