import CardNav from "./ui/card-nav";

const NAV_ITEMS = [
  {
    label: "About",
    bgColor: "#1B1722",
    textColor: "#fff",
    links: [
      { label: "Company", ariaLabel: "About Company", href: "#company" },
      { label: "Careers", ariaLabel: "About Careers", href: "#careers" },
    ],
  },
  {
    label: "Projects",
    bgColor: "#2F293A",
    textColor: "#fff",
    links: [
      { label: "Featured", ariaLabel: "Featured Projects", href: "#featured" },
      {
        label: "Case Studies",
        ariaLabel: "Project Case Studies",
        href: "#case-studies",
      },
    ],
  },
  {
    label: "Contact",
    bgColor: "#2F293A",
    textColor: "#fff",
    links: [
      {
        label: "Email",
        ariaLabel: "Email us",
        href: "mailto:hello@example.com",
      },
      { label: "Twitter", ariaLabel: "Twitter", href: "https://twitter.com" },
      {
        label: "LinkedIn",
        ariaLabel: "LinkedIn",
        href: "https://linkedin.com",
      },
    ],
  },
];

export default function Navbar() {
  return (
    <CardNav
      logo="/logo.png"
      logoAlt="NourishAI"
      items={NAV_ITEMS}
      baseColor="#151717"
      menuColor="#c74203"
      buttonBgColor="#0a0d0c"
      buttonTextColor="#c74203"
      ease="power3.out"
    />
  );
}