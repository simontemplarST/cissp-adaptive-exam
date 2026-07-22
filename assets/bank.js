/* ============================================================================
   CISSP QUESTION BANK + FACT-DRIVEN GENERATOR
   ----------------------------------------------------------------------------
   Produces up to TARGET questions that are CORRECT BY CONSTRUCTION:
   every item is built from verified fact tables, never scraped from
   copyrighted / leaked exam pools.

   Two engines:
     1. Category engine  — "which IS / which is NOT a <category>" over
        curated membership sets. Distractors pulled from sibling categories.
     2. Fact engine      — definition-match, mapping, and property questions
        from structured knowledge tables (ports, OSI, models, laws, ...).

   A seeded PRNG makes the whole bank deterministic and reproducible.
   ============================================================================ */
(function (global) {
  "use strict";

  /* ---------- seeded PRNG (mulberry32) ---------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const DOMAINS = {
    D1: "1 · Security & Risk Management",
    D2: "2 · Asset Security",
    D3: "3 · Security Architecture & Engineering",
    D4: "4 · Communication & Network Security",
    D5: "5 · Identity & Access Management",
    D6: "6 · Security Assessment & Testing",
    D7: "7 · Security Operations",
    D8: "8 · Software Development Security"
  };

  const LINKS = {
    D1: "https://www.isc2.org/certifications/cissp",
    D2: "https://csrc.nist.gov/pubs/sp/800/88/r1/final",
    D3: "https://csrc.nist.gov/glossary",
    D4: "https://en.wikipedia.org/wiki/Internet_protocol_suite",
    D5: "https://csrc.nist.gov/glossary/term/access_control",
    D6: "https://owasp.org/www-project-web-security-testing-guide/",
    D7: "https://csrc.nist.gov/pubs/sp/800/61/r2/final",
    D8: "https://owasp.org/www-project-top-ten/",
    ports: "https://en.wikipedia.org/wiki/List_of_TCP_and_UDP_port_numbers",
    osi: "https://en.wikipedia.org/wiki/OSI_model",
    crypto: "https://en.wikipedia.org/wiki/Cryptography",
    models: "https://en.wikipedia.org/wiki/Computer_security_model",
    law: "https://en.wikipedia.org/wiki/Information_privacy_law",
    attack: "https://owasp.org/www-community/attacks/",
    bcdr: "https://en.wikipedia.org/wiki/Disaster_recovery",
    ir: "https://csrc.nist.gov/pubs/sp/800/61/r2/final"
  };

  /* ========================================================================
     CATEGORY ENGINE DATA
     Each category = a set of members that TRULY belong. "which is NOT"
     distractors are the members; the odd-one-out is drawn from siblings.
     ======================================================================== */
  const CATEGORIES = [
    // ---- crypto family ----
    { dom: "D3", family: "crypto", diff: "medium", label: "symmetric encryption algorithm",
      members: ["AES", "DES", "3DES", "Blowfish", "Twofish", "RC4", "RC5", "RC6", "IDEA", "Serpent", "CAST-128", "ChaCha20", "Camellia", "Skipjack"],
      link: LINKS.crypto,
      why: "Symmetric algorithms use one shared secret key for both encryption and decryption. Asymmetric algorithms use a public/private key pair; hash functions are one-way and keyless." },
    { dom: "D3", family: "crypto", diff: "medium", label: "asymmetric (public-key) algorithm",
      members: ["RSA", "ECC", "Diffie-Hellman", "ElGamal", "DSA", "ECDSA", "ECDH", "Ed25519"],
      link: LINKS.crypto,
      why: "Asymmetric algorithms use a mathematically linked public/private key pair, solving key distribution. Symmetric ciphers share one secret key; hashes produce a fixed one-way digest." },
    { dom: "D3", family: "crypto", diff: "medium", label: "cryptographic hash function",
      members: ["SHA-1", "SHA-256", "SHA-512", "SHA-3", "MD5", "RIPEMD-160", "Whirlpool", "BLAKE2", "bcrypt", "scrypt", "Argon2"],
      link: LINKS.crypto,
      why: "Hash functions map input to a fixed-length one-way digest for integrity; they use no key for basic hashing. Encryption algorithms are reversible with a key." },
    { dom: "D3", family: "crypto", diff: "hard", label: "block cipher mode of operation",
      members: ["ECB", "CBC", "CFB", "OFB", "CTR", "GCM", "XTS", "CCM"],
      link: "https://en.wikipedia.org/wiki/Block_cipher_mode_of_operation",
      why: "Modes of operation define how a block cipher processes data longer than one block. GCM/CCM add authentication; ECB is insecure for structured data." },
    // ---- network family ----
    { dom: "D4", family: "net", diff: "medium", label: "routing protocol",
      members: ["OSPF", "BGP", "RIP", "EIGRP", "IS-IS"],
      link: LINKS.D4,
      why: "Routing protocols exchange reachability information between routers. OSPF/IS-IS are link-state, RIP/EIGRP are distance/hybrid, BGP is the path-vector protocol of the Internet." },
    { dom: "D4", family: "net", diff: "medium", label: "VPN / tunneling protocol",
      members: ["IPsec", "L2TP", "PPTP", "OpenVPN", "WireGuard", "SSTP", "IKEv2"],
      link: "https://en.wikipedia.org/wiki/Virtual_private_network",
      why: "These establish encrypted or encapsulated tunnels across untrusted networks. PPTP is legacy/weak; IPsec and WireGuard are modern standards." },
    { dom: "D4", family: "net", diff: "hard", label: "secure email protocol/standard",
      members: ["S/MIME", "PGP", "DKIM", "SPF", "DMARC", "STARTTLS"],
      link: "https://en.wikipedia.org/wiki/Email_authentication",
      why: "These protect email confidentiality, integrity, or authenticity. SPF/DKIM/DMARC authenticate the sending domain; S/MIME and PGP encrypt/sign message content." },
    { dom: "D4", family: "net", diff: "medium", label: "wireless security standard",
      members: ["WEP", "WPA", "WPA2", "WPA3", "802.11i", "802.1X"],
      link: "https://en.wikipedia.org/wiki/Wi-Fi_Protected_Access",
      why: "These secure wireless LANs. WEP is broken, WPA2 uses AES-CCMP, WPA3 adds SAE (dragonfly) to resist offline cracking." },
    // ---- IAM family ----
    { dom: "D5", family: "iam", diff: "medium", label: "federation / SSO protocol",
      members: ["SAML", "OAuth 2.0", "OpenID Connect", "WS-Federation", "Kerberos"],
      link: LINKS.D5,
      why: "These enable single sign-on and federated identity. SAML and OIDC handle web SSO; OAuth handles authorization/delegation; Kerberos handles enterprise ticket-based SSO." },
    { dom: "D5", family: "iam", diff: "medium", label: "AAA / directory protocol",
      members: ["RADIUS", "TACACS+", "Diameter", "LDAP", "Kerberos"],
      link: LINKS.D5,
      why: "These provide authentication, authorization, accounting, or directory services. TACACS+ separates AAA and encrypts the full payload; RADIUS encrypts only the password." },
    { dom: "D5", family: "iam", diff: "easy", label: "'something you have' authentication factor",
      members: ["smart card", "hardware token", "OTP token", "security key", "authenticator-app phone"],
      link: LINKS.D5,
      why: "'Something you have' is a possession factor. 'Something you know' is a password/PIN; 'something you are' is a biometric." },
    // ---- threats family ----
    { dom: "D7", family: "threat", diff: "medium", label: "type of malware",
      members: ["virus", "worm", "trojan", "ransomware", "rootkit", "spyware", "keylogger", "logic bomb", "botnet agent", "adware"],
      link: "https://en.wikipedia.org/wiki/Malware",
      why: "Malware is malicious software. A worm self-propagates without a host; a virus needs a host file; a trojan masquerades as legitimate software." },
    { dom: "D4", family: "threat", diff: "medium", label: "denial-of-service / flooding attack",
      members: ["SYN flood", "Smurf attack", "Ping of Death", "Teardrop", "DDoS", "DNS amplification", "Fraggle"],
      link: LINKS.attack,
      why: "These aim to exhaust resources or crash a target. Amplification/reflection attacks abuse third parties (DNS, ICMP) to multiply traffic against the victim." },
    { dom: "D8", family: "threat", diff: "medium", label: "web application vulnerability (OWASP)",
      members: ["SQL injection", "cross-site scripting", "cross-site request forgery", "insecure deserialization", "XML external entity", "server-side request forgery", "broken access control", "security misconfiguration"],
      link: LINKS.D8,
      why: "These are common web app weaknesses catalogued by OWASP. Injection and broken access control are perennial Top-10 entries." },
    // ---- models family ----
    { dom: "D3", family: "model", diff: "hard", label: "formal security / access-control model",
      members: ["Bell-LaPadula", "Biba", "Clark-Wilson", "Brewer-Nash", "Graham-Denning", "Harrison-Ruzzo-Ullman", "Take-Grant", "Lattice-based"],
      link: LINKS.models,
      why: "These are formal models describing how subjects may access objects. Bell-LaPadula addresses confidentiality; Biba and Clark-Wilson address integrity; Brewer-Nash addresses conflicts of interest." },
    // ---- resilience family ----
    { dom: "D7", family: "resil", diff: "easy", label: "recovery site type",
      members: ["hot site", "warm site", "cold site", "mobile site", "cloud site", "reciprocal site"],
      link: LINKS.bcdr,
      why: "Recovery sites trade cost against recovery speed. Hot = fully ready, warm = partially equipped, cold = space/power only." },
    { dom: "D7", family: "resil", diff: "medium", label: "backup strategy",
      members: ["full backup", "incremental backup", "differential backup", "synthetic full backup", "snapshot"],
      link: "https://en.wikipedia.org/wiki/Backup",
      why: "Backup strategies trade backup time against restore time. Differential grows from the last full; incremental captures changes since the last backup of any type." }
  ];

  // family -> all member terms, for plausible same-family distractors.
  const FAMILY_TERMS = {};
  CATEGORIES.forEach(c => {
    FAMILY_TERMS[c.family] = FAMILY_TERMS[c.family] || [];
    c.members.forEach(m => FAMILY_TERMS[c.family].push({ term: m, label: c.label }));
  });
  const article = w => (/^[aeiou]/i.test(w) ? "an " : "a ");

  /* ========================================================================
     FACT ENGINE DATA
     ======================================================================== */

  // --- default ports ---
  const PORTS = [
    ["FTP (data)", 20, "TCP"], ["FTP (control)", 21, "TCP"], ["SSH", 22, "TCP"],
    ["Telnet", 23, "TCP"], ["SMTP", 25, "TCP"], ["DNS", 53, "TCP/UDP"],
    ["DHCP (server)", 67, "UDP"], ["TFTP", 69, "UDP"], ["HTTP", 80, "TCP"],
    ["Kerberos", 88, "TCP/UDP"], ["POP3", 110, "TCP"], ["NNTP", 119, "TCP"],
    ["NTP", 123, "UDP"], ["RPC / endpoint mapper", 135, "TCP"], ["NetBIOS name", 137, "UDP"],
    ["SNMP", 161, "UDP"], ["SNMP trap", 162, "UDP"], ["LDAP", 389, "TCP"],
    ["HTTPS", 443, "TCP"], ["SMB / CIFS", 445, "TCP"], ["SMTPS", 465, "TCP"],
    ["Syslog", 514, "UDP"], ["LDAPS", 636, "TCP"], ["IMAPS", 993, "TCP"],
    ["POP3S", 995, "TCP"], ["MS SQL", 1433, "TCP"], ["Oracle DB", 1521, "TCP"],
    ["PPTP", 1723, "TCP"], ["RADIUS auth", 1812, "UDP"], ["MySQL", 3306, "TCP"],
    ["RDP", 3389, "TCP"], ["IMAP", 143, "TCP"], ["RADIUS (legacy)", 1645, "UDP"],
    ["TACACS+", 49, "TCP"], ["IPsec IKE", 500, "UDP"], ["PostgreSQL", 5432, "TCP"]
  ];

  // --- OSI layer mapping ---
  const OSI = [
    ["repeater / hub", 1, "Physical"], ["cabling & bit signaling", 1, "Physical"],
    ["switch / MAC addressing", 2, "Data Link"], ["ARP", 2, "Data Link"],
    ["VLAN tagging (802.1Q)", 2, "Data Link"], ["PPP / L2TP", 2, "Data Link"],
    ["router / IP addressing", 3, "Network"], ["IPsec", 3, "Network"],
    ["ICMP", 3, "Network"], ["OSPF routing", 3, "Network"],
    ["TCP / UDP", 4, "Transport"], ["port numbers", 4, "Transport"],
    ["TLS (session negotiation)", 5, "Session"], ["RPC / NetBIOS sessions", 5, "Session"],
    ["encryption / compression / ASCII-EBCDIC", 6, "Presentation"], ["JPEG / MPEG formatting", 6, "Presentation"],
    ["HTTP / FTP / SMTP", 7, "Application"], ["DNS resolution service", 7, "Application"]
  ];
  const OSI_NAMES = ["Physical (1)", "Data Link (2)", "Network (3)", "Transport (4)", "Session (5)", "Presentation (6)", "Application (7)"];

  // --- glossary: term -> definition (definition-match engine) ---
  const GLOSSARY = [
    ["D1", "Due care", "Taking the reasonable, prudent steps a responsible party would take to protect an organization's interests."],
    ["D1", "Due diligence", "The ongoing practice of investigating and understanding the risks an organization faces."],
    ["D1", "Risk appetite", "The total amount of risk an organization is willing to accept in pursuit of its objectives."],
    ["D1", "Residual risk", "The risk that remains after controls have been applied."],
    ["D1", "Inherent risk", "The level of risk present before any controls are applied."],
    ["D1", "Qualitative risk analysis", "Assessing risk using relative, non-numeric rankings such as high/medium/low."],
    ["D1", "Quantitative risk analysis", "Assessing risk using numeric monetary values such as SLE, ARO, and ALE."],
    ["D1", "ALE", "The expected yearly monetary loss from a risk, calculated as SLE multiplied by ARO."],
    ["D1", "SLE", "The monetary loss expected from a single occurrence of a risk (asset value times exposure factor)."],
    ["D1", "Exposure factor", "The percentage of an asset's value that would be lost in a single realized threat."],
    ["D1", "Risk transference", "Shifting the financial impact of a risk to a third party, such as through insurance."],
    ["D1", "Risk avoidance", "Eliminating a risk by discontinuing the activity that causes it."],
    ["D1", "Threat", "Any potential event or actor that could cause harm to an asset."],
    ["D1", "Vulnerability", "A weakness in a system, control, or process that a threat can exploit."],
    ["D1", "Exploit", "The specific means by which a vulnerability is taken advantage of."],
    ["D1", "Safeguard", "A proactive control implemented to reduce risk (also called a countermeasure)."],
    ["D1", "Baseline", "A minimum mandatory level of security that all in-scope systems must meet."],
    ["D1", "Guideline", "A recommended, non-mandatory suggestion for achieving a security objective."],
    ["D1", "Standard", "A mandatory rule specifying uniform use of a technology or method."],
    ["D1", "Procedure", "A detailed, step-by-step set of instructions for performing a task."],
    ["D1", "Policy", "A high-level management statement of security intent and direction."],
    ["D2", "Data owner", "The senior business role accountable for classifying data and defining its protection."],
    ["D2", "Data custodian", "The role responsible for the day-to-day implementation and maintenance of data protection controls."],
    ["D2", "Data processor", "An entity that processes personal data on behalf of, and under instructions from, the controller."],
    ["D2", "Data controller", "The entity that determines the purposes and means of processing personal data."],
    ["D2", "Data remanence", "Residual representation of data that remains after attempts to erase it."],
    ["D2", "Degaussing", "Erasing magnetic media by exposing it to a strong magnetic field."],
    ["D2", "Cryptographic erase", "Rendering data unrecoverable by destroying the encryption key that protects it."],
    ["D2", "Tokenization", "Replacing sensitive data with a non-sensitive surrogate that maps back to the original in a secure vault."],
    ["D2", "Data masking", "Obscuring specific data within a dataset so it is unusable while preserving format."],
    ["D2", "Scoping", "Selecting only the applicable controls from a baseline for a given system."],
    ["D2", "Tailoring", "Adjusting a baseline of controls to fit an organization's specific needs."],
    ["D3", "Reference monitor", "The abstract concept that mediates all access between subjects and objects."],
    ["D3", "Security kernel", "The hardware, firmware, and software that implement the reference monitor concept."],
    ["D3", "TCB", "The totality of protection mechanisms within a system responsible for enforcing security policy."],
    ["D3", "Covert channel", "An unauthorized communication path that violates the security policy."],
    ["D3", "Maintenance hook", "A back-door access mechanism left in software by developers."],
    ["D3", "TOCTOU", "A race-condition flaw exploiting the gap between when a resource is checked and when it is used."],
    ["D3", "Aggregation", "Combining individually non-sensitive data to derive sensitive information."],
    ["D3", "Inference", "Deducing sensitive information from data one is authorized to access."],
    ["D3", "Trusted Platform Module", "A hardware root of trust that stores keys and supports measured boot."],
    ["D3", "Salting", "Adding random data to a password before hashing to defeat precomputed tables."],
    ["D3", "Perfect forward secrecy", "A property ensuring that compromise of a long-term key does not expose past session keys."],
    ["D4", "VLAN", "A logical segmentation of a switched network into separate broadcast domains."],
    ["D4", "Subnetting", "Dividing an IP network into smaller logical networks."],
    ["D4", "NAT", "Translating private IP addresses to public addresses at a network boundary."],
    ["D4", "DMZ", "A screened subnet between the internal network and the Internet for public-facing hosts."],
    ["D4", "Stateful firewall", "A firewall that tracks connection state to permit return traffic of established sessions."],
    ["D4", "Proxy", "An intermediary that makes requests on behalf of clients, hiding them from servers."],
    ["D4", "IDS", "A system that detects and alerts on suspicious activity but does not block it."],
    ["D4", "IPS", "A system that detects and actively blocks suspicious activity inline."],
    ["D4", "ARP spoofing", "Forging ARP replies to associate an attacker's MAC with another host's IP."],
    ["D5", "Identification", "The act of a subject claiming an identity."],
    ["D5", "Authentication", "Proving a claimed identity with one or more factors."],
    ["D5", "Authorization", "Granting a subject the rights and permissions to a resource."],
    ["D5", "Accountability", "Tracing actions uniquely to an individual, typically via audit logs."],
    ["D5", "Least privilege", "Granting subjects only the access required to perform their duties."],
    ["D5", "Separation of duties", "Splitting a sensitive task so no single person can complete it alone."],
    ["D5", "Privilege creep", "The gradual accumulation of access rights beyond what a role requires."],
    ["D5", "Single sign-on", "Authenticating once to gain access to multiple independent systems."],
    ["D5", "Federation", "Extending identity and access across organizational or trust boundaries."],
    ["D5", "SAML assertion", "An XML statement issued by an identity provider about a subject's authentication."],
    ["D5", "CER", "The point where a biometric system's false accept and false reject rates are equal."],
    ["D5", "Type I error (biometrics)", "A false rejection: a legitimate user is incorrectly denied."],
    ["D5", "Type II error (biometrics)", "A false acceptance: an impostor is incorrectly granted access."],
    ["D6", "SAST", "Analyzing source code for security flaws without executing the program."],
    ["D6", "DAST", "Testing a running application for vulnerabilities from the outside."],
    ["D6", "Fuzzing", "Supplying malformed or random input to a program to trigger failures."],
    ["D6", "Penetration test", "An authorized simulated attack that actively exploits weaknesses to demonstrate impact."],
    ["D6", "Vulnerability scan", "An automated check that identifies potential weaknesses without exploiting them."],
    ["D6", "False positive", "A benign finding incorrectly reported as a vulnerability."],
    ["D6", "False negative", "A real vulnerability that a test fails to detect."],
    ["D6", "Regression testing", "Re-testing to confirm that recent changes have not broken existing functionality."],
    ["D6", "Rules of engagement", "The documented scope, limits, and authorization for a security test."],
    ["D7", "RTO", "The maximum acceptable time to restore a system after a disruption."],
    ["D7", "RPO", "The maximum acceptable amount of data loss measured in time."],
    ["D7", "MTD", "The maximum time a business function can be unavailable before unacceptable harm."],
    ["D7", "MTBF", "The average time between failures of a repairable component."],
    ["D7", "MTTR", "The average time required to repair a failed component and restore service."],
    ["D7", "Chain of custody", "Documentation of who handled evidence, when, and how, to preserve its integrity."],
    ["D7", "Order of volatility", "Collecting the most perishable evidence first during forensics."],
    ["D7", "BIA", "An analysis identifying critical functions and the impact of their disruption."],
    ["D7", "Containment", "Limiting the scope and spread of an incident after detection."],
    ["D7", "Eradication", "Removing the cause of an incident, such as malware or compromised accounts."],
    ["D8", "Threat modeling", "Systematically identifying and prioritizing potential threats during design."],
    ["D8", "Input validation", "Verifying that supplied data conforms to expected format before use."],
    ["D8", "Output encoding", "Escaping data for its rendering context to prevent injection such as XSS."],
    ["D8", "Parameterized query", "A database query that separates code from data to prevent SQL injection."],
    ["D8", "SBOM", "A formal inventory of the components and dependencies in a software product."],
    ["D8", "Fail-secure", "Defaulting to a denied/locked state when a control fails."],
    ["D8", "Race condition", "A flaw where the outcome depends on the uncontrolled timing of events."],
    ["D8", "Code review", "Manual or assisted inspection of source code to find defects and vulnerabilities."],
    ["D8", "Sandboxing", "Executing untrusted code in an isolated environment to contain its effects."]
  ];

  // --- specific mapping facts (single-answer) ---
  const MODEL_FACTS = [
    ["D3", "Which model is designed to protect the CONFIDENTIALITY of classified information?", "Bell-LaPadula",
      ["Biba", "Clark-Wilson", "Brewer-Nash"], "Bell-LaPadula uses 'no read up / no write down' to preserve confidentiality across classification levels.", LINKS.models],
    ["D3", "The 'no write down' rule (the *-property) belongs to which model?", "Bell-LaPadula",
      ["Biba", "Clark-Wilson", "Take-Grant"], "Bell-LaPadula's *-property forbids writing to a lower classification, protecting confidentiality.", LINKS.models],
    ["D3", "Which model enforces integrity with 'no read down / no write up'?", "Biba",
      ["Bell-LaPadula", "Brewer-Nash", "Graham-Denning"], "Biba is the integrity inverse of Bell-LaPadula: subjects can't read lower-integrity data or write to higher-integrity data.", LINKS.models],
    ["D3", "Which model uses well-formed transactions and separation of duties to protect integrity?", "Clark-Wilson",
      ["Bell-LaPadula", "Biba", "Lattice-based"], "Clark-Wilson enforces integrity through certified transactions, the access triple, and separation of duties.", LINKS.models],
    ["D3", "Which model prevents conflicts of interest (the 'Chinese Wall')?", "Brewer-Nash",
      ["Biba", "Bell-LaPadula", "Clark-Wilson"], "Brewer-Nash dynamically restricts access based on what a subject has already accessed, preventing conflict-of-interest data flows.", LINKS.models]
  ];

  const LAW_FACTS = [
    ["D1", "Which regulation governs the protection of personal data of EU residents?", "GDPR",
      ["HIPAA", "SOX", "GLBA"], "The EU General Data Protection Regulation governs processing of EU residents' personal data, with extraterritorial reach.", LINKS.law],
    ["D1", "Which US law protects the privacy and security of health information?", "HIPAA",
      ["SOX", "GLBA", "FERPA"], "HIPAA (Health Insurance Portability and Accountability Act) sets Privacy and Security Rules for protected health information.", LINKS.law],
    ["D1", "Which US law addresses corporate financial reporting integrity after Enron?", "SOX",
      ["HIPAA", "COPPA", "GLBA"], "The Sarbanes-Oxley Act mandates internal controls and accuracy of corporate financial reporting.", LINKS.law],
    ["D1", "Which standard governs the handling of payment card data?", "PCI-DSS",
      ["HIPAA", "FISMA", "SOX"], "PCI-DSS is a contractual industry standard (not a law) protecting cardholder data.", LINKS.law],
    ["D1", "Which US law requires federal agencies to secure their information systems?", "FISMA",
      ["HIPAA", "GLBA", "COPPA"], "The Federal Information Security Management Act requires federal agencies to implement risk-based security programs.", LINKS.law],
    ["D1", "Which US law protects the privacy of student education records?", "FERPA",
      ["HIPAA", "COPPA", "GLBA"], "FERPA governs access to and privacy of student education records.", LINKS.law],
    ["D1", "Which US law governs data collected online from children under 13?", "COPPA",
      ["FERPA", "HIPAA", "SOX"], "The Children's Online Privacy Protection Act restricts collecting data from children under 13.", LINKS.law],
    ["D1", "Which US law requires financial institutions to protect customer information?", "GLBA",
      ["SOX", "HIPAA", "FERPA"], "The Gramm-Leach-Bliley Act requires financial institutions to safeguard customers' nonpublic personal information.", LINKS.law]
  ];

  const IR_FACTS = [
    ["D7", "What is the FIRST phase of the NIST incident response lifecycle?", "Preparation",
      ["Detection & Analysis", "Containment", "Recovery"], "NIST SP 800-61 begins with Preparation — building the capability before an incident occurs.", LINKS.ir],
    ["D7", "In which IR phase do you remove malware and disable breached accounts?", "Eradication",
      ["Containment", "Recovery", "Preparation"], "Eradication removes the root cause after containment and before recovery restores normal operations.", LINKS.ir],
    ["D7", "Which IR phase limits the spread of an active incident?", "Containment",
      ["Eradication", "Recovery", "Lessons Learned"], "Containment isolates affected systems to stop the incident from spreading while evidence is preserved.", LINKS.ir],
    ["D7", "Restoring systems to normal operation and monitoring them occurs in which phase?", "Recovery",
      ["Containment", "Eradication", "Preparation"], "Recovery returns systems to production and validates they are functioning and clean.", LINKS.ir]
  ];

  const MISC_FACTS = [
    ["D3", "Which cloud model gives the customer the LEAST management responsibility?", "SaaS",
      ["IaaS", "PaaS", "On-premises"], "In SaaS the provider manages everything up to the application; the customer only manages data and access.", "https://csrc.nist.gov/pubs/sp/800/145/final"],
    ["D3", "Which cloud model gives the customer the MOST control over the OS and runtime?", "IaaS",
      ["SaaS", "PaaS", "FaaS"], "IaaS provides virtualized infrastructure; the customer manages the OS, runtime, and applications.", "https://csrc.nist.gov/pubs/sp/800/145/final"],
    ["D2", "Which RAID level provides striping with NO redundancy?", "RAID 0",
      ["RAID 1", "RAID 5", "RAID 6"], "RAID 0 stripes data for performance but offers no fault tolerance — any disk failure loses all data.", "https://en.wikipedia.org/wiki/RAID"],
    ["D2", "Which RAID level mirrors data across two disks?", "RAID 1",
      ["RAID 0", "RAID 5", "RAID 10"], "RAID 1 mirrors identical copies, providing redundancy at the cost of 50% capacity.", "https://en.wikipedia.org/wiki/RAID"],
    ["D2", "Which RAID level uses striping with distributed single parity?", "RAID 5",
      ["RAID 0", "RAID 1", "RAID 6"], "RAID 5 stripes data with one parity block distributed across disks, tolerating a single disk failure.", "https://en.wikipedia.org/wiki/RAID"],
    ["D5", "Which access control model lets the data OWNER decide who gets access?", "DAC",
      ["MAC", "RBAC", "ABAC"], "Discretionary Access Control lets resource owners grant access at their discretion.", LINKS.D5],
    ["D5", "Which access control model uses system-enforced labels/clearances?", "MAC",
      ["DAC", "RBAC", "ABAC"], "Mandatory Access Control enforces access via labels and clearances set by the system, not owners.", LINKS.D5],
    ["D5", "Which access control model grants access based on job function?", "RBAC",
      ["DAC", "MAC", "ABAC"], "Role-Based Access Control assigns permissions to roles that users inherit by membership.", LINKS.D5],
    ["D5", "Which access control model evaluates policies over subject/resource attributes?", "ABAC",
      ["DAC", "MAC", "RBAC"], "Attribute-Based Access Control decides access dynamically from attributes and policy rules.", LINKS.D5],
    ["D7", "Which fire suppression agent is safe for occupied data centers and leaves no residue?", "Clean agent (e.g., FM-200)",
      ["Water sprinkler", "CO2 flooding", "Dry powder"], "Clean agents like FM-200 suppress fire without residue and are safe for people and electronics; CO2 flooding is dangerous to occupants.", "https://en.wikipedia.org/wiki/Gaseous_fire_suppression"],
    ["D7", "In DR, which metric drives how FREQUENTLY you must back up?", "RPO",
      ["RTO", "MTD", "MTBF"], "The Recovery Point Objective caps acceptable data loss, so a tighter RPO requires more frequent backups.", LINKS.bcdr]
  ];

  /* ========================================================================
     GENERATOR
     ======================================================================== */
  function buildBank(target, seed) {
    const rnd = mulberry32(seed >>> 0);
    const pick = arr => arr[Math.floor(rnd() * arr.length)];
    const shuffle = arr => {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
      return a;
    };
    const sample = (arr, n, exclude) => {
      const pool = shuffle(arr.filter(x => !exclude || !exclude.includes(x)));
      return pool.slice(0, n);
    };

    const out = [];
    const seen = new Set();
    const push = (dom, diff, q, opts, correctVal, why, link) => {
      // require 4 unique options and a present, unambiguous correct answer
      const uniq = [];
      opts.forEach(o => { if (!uniq.includes(o)) uniq.push(o); });
      if (uniq.length !== 4) return;
      if (uniq.filter(o => o === correctVal).length !== 1) return;
      const shuffled = shuffle(uniq);
      const c = shuffled.indexOf(correctVal);
      if (c < 0) return;
      const sig = q + "||" + shuffled.join("|");
      if (seen.has(sig)) return;
      seen.add(sig);
      out.push({ dom, d: diff, q, o: shuffled, c, why, link });
    };

    // ---- 1. Category engine: "which IS" and "which is NOT" ----
    // Distractors are drawn from the SAME family (plausible, confusable),
    // never the same category, so the correct answer is unique & the wrong
    // options are believable.
    function categoryRound() {
      CATEGORIES.forEach(cat => {
        const family = FAMILY_TERMS[cat.family] || [];
        const siblings = family.filter(t => t.label !== cat.label).map(t => t.term);
        if (siblings.length < 3) return;
        // which IS
        const correct = pick(cat.members);
        const distractors = sample(siblings, 3);
        if (distractors.length === 3) {
          push(cat.dom, cat.diff,
            "Which of the following is " + article(cat.label) + cat.label + "?",
            [correct, ...distractors], correct, cat.why, cat.link);
        }
        // which is NOT (three real members + one sibling odd-one-out)
        const members3 = sample(cat.members, 3);
        const odd = pick(siblings);
        if (members3.length === 3 && odd) {
          push(cat.dom, cat.diff === "easy" ? "medium" : cat.diff,
            "Which of the following is NOT " + article(cat.label) + cat.label + "?",
            [odd, ...members3], odd,
            odd + " is not " + article(cat.label) + cat.label + ". " + cat.why, cat.link);
        }
      });
    }

    // ---- 2. Glossary engine: term<->definition ----
    function glossaryRound() {
      GLOSSARY.forEach(([dom, term, def]) => {
        const otherTerms = GLOSSARY.filter(g => g[1] !== term).map(g => g[1]);
        const otherDefs = GLOSSARY.filter(g => g[1] !== term).map(g => g[2]);
        // definition -> term
        const dTerms = sample(otherTerms, 3);
        if (dTerms.length === 3) {
          push(dom, "medium",
            "Which term BEST describes the following? “" + def + "”",
            [term, ...dTerms], term,
            "“" + def + "” is the definition of " + term + ".", LINKS[dom]);
        }
        // term -> definition
        const dDefs = sample(otherDefs, 3);
        if (dDefs.length === 3) {
          push(dom, "medium",
            "What does “" + term + "” refer to?",
            [def, ...dDefs], def,
            term + ": " + def, LINKS[dom]);
        }
      });
    }

    // ---- 3. Port engine ----
    function portRound() {
      PORTS.forEach(([svc, port, tp]) => {
        const otherPorts = PORTS.filter(p => p[1] !== port).map(p => p[1] + "");
        const dp = sample(otherPorts, 3);
        if (dp.length === 3) {
          push("D4", "medium",
            "Which default port does " + svc + " use?",
            [port + "", ...dp], port + "",
            svc + " uses port " + port + " (" + tp + ") by default.", LINKS.ports);
        }
        const otherSvcs = PORTS.filter(p => p[1] !== port).map(p => p[0]);
        const ds = sample(otherSvcs, 3);
        if (ds.length === 3) {
          push("D4", "medium",
            "Which service uses default port " + port + "?",
            [svc, ...ds], svc,
            "Port " + port + " (" + tp + ") is the default for " + svc + ".", LINKS.ports);
        }
      });
    }

    // ---- 4. OSI engine ----
    function osiRound() {
      OSI.forEach(([item, num, name]) => {
        const correct = name + " (" + num + ")";
        const distractors = sample(OSI_NAMES.filter(n => n !== correct), 3);
        if (distractors.length === 3) {
          push("D4", "medium",
            "At which OSI layer does " + item + " operate?",
            [correct, ...distractors], correct,
            item + " operates at the " + name + " layer (Layer " + num + ").", LINKS.osi);
        }
      });
    }

    // ---- 5. Fixed single-answer facts ----
    function factRound(list) {
      list.forEach(([dom, q, correct, distractors, why, link]) => {
        push(dom, "medium", q, [correct, ...distractors], correct, why, link);
      });
    }

    // Run rounds repeatedly (fresh RNG picks) until target reached.
    let guard = 0;
    while (out.length < target && guard < 4000) {
      categoryRound();
      glossaryRound();
      portRound();
      osiRound();
      factRound(MODEL_FACTS);
      factRound(LAW_FACTS);
      factRound(IR_FACTS);
      factRound(MISC_FACTS);
      guard++;
    }
    return out.slice(0, target);
  }

  global.CISSP_BANK = {
    DOMAINS,
    build: buildBank,
    // approximate count of distinct items the generator can produce
    capacity: 10000
  };
})(typeof window !== "undefined" ? window : globalThis);
