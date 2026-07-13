import React from "react";
import Navbar from "../components/Navbar";
import HomeBanner from "../components/HomeBanner";
import HomeCars from "../components/HomeCars";
import Testimonial from "../components/Testimonial";
import Footer from "../components/Footer";

const Home = () => {
  return (
    <div>
      <div className="bg-black">
        <Navbar />
        <HomeBanner />
      </div>
      <HomeCars />
      <Testimonial />
      <Footer />
    </div>
  );
};

export default Home;
