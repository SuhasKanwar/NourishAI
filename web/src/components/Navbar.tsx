import CardNav from "./ui/card-nav";

const NAV_ITEMS = [
  {
    label: "About",
    bgColor: "var(--primary-bg-color)",
    textColor: "var(--primary-text-color)",
    links: [
      { label: "Company", ariaLabel: "About Company", href: "#company" },
      { label: "Careers", ariaLabel: "About Careers", href: "#careers" },
    ],
  },
  {
    label: "Projects",
    bgColor: "var(--primary-color)",
    textColor: "var(--primary-text-color)",
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
    bgColor: "var(--secondary-color)",
    textColor: "var(--primary-text-color)",
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
      baseColor="var(--primary-bg-color)"
      menuColor="var(--secondary-color)"
      buttonBgColor="var(--primary-bg-color)"
      buttonTextColor="var(--secondary-color)"
      ease="power3.out"
    />
  );
}