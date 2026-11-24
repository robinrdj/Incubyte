/**
 * Name pools for the seed data, by region. Each country draws from the pool that fits it, so a
 * German office mostly has German names and an Indian office Indian names. The pools are large
 * enough that, with the generator's retry on repeats, full names are almost always unique.
 */
export interface NamePool {
  readonly first: readonly string[];
  readonly last: readonly string[];
}

/** United States, United Kingdom, Canada, Australia. Deliberately mixed, as those workforces are. */
// prettier-ignore
const ENGLISH: NamePool = {
  first: [
    "Olivia", "Liam", "Emma", "Noah", "Ava", "Oliver", "Sophia", "Elijah", "Isabella", "James",
    "Mia", "William", "Charlotte", "Benjamin", "Amelia", "Lucas", "Harper", "Henry", "Evelyn",
    "Theodore", "Abigail", "Jack", "Emily", "Samuel", "Ella", "Owen", "Scarlett", "Daniel",
    "Grace", "Matthew", "Chloe", "Joseph", "Victoria", "David", "Riley", "Wyatt", "Aria", "Ryan",
    "Lily", "Nathan", "Zoey", "Isaac", "Nora", "Caleb", "Hannah", "Dylan", "Layla", "Andrew",
    "Madison", "Joshua", "Stella", "Christopher", "Hazel", "Thomas", "Aurora", "Charles", "Lucy",
    "Aaron", "Natalie", "Adrian", "Leah", "Marcus", "Savannah", "Julian", "Audrey", "Jordan",
    "Claire", "Connor", "Maya", "Ethan", "Rachel", "Gavin", "Megan", "Kevin", "Sarah", "Jason",
    "Laura", "Tyler", "Rebecca", "Simon", "Fiona", "Callum", "Imogen", "Declan", "Siobhan",
    "Aidan", "Freya", "Rhys", "Bethany", "Jasmine", "Carlos", "Ana", "Wei", "Mei", "Jamal",
    "Aaliyah", "Hiroshi", "Yuna", "Andre", "Keisha",
  ],
  last: [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Miller", "Davis", "Wilson", "Anderson",
    "Taylor", "Thomas", "Moore", "Jackson", "Martin", "Lee", "Thompson", "White", "Harris",
    "Clark", "Lewis", "Robinson", "Walker", "Young", "King", "Wright", "Scott", "Green", "Baker",
    "Adams", "Nelson", "Hill", "Campbell", "Mitchell", "Roberts", "Carter", "Phillips", "Evans",
    "Turner", "Parker", "Collins", "Edwards", "Stewart", "Morris", "Murphy", "Cook", "Rogers",
    "Morgan", "Cooper", "Peterson", "Reed", "Bailey", "Bell", "Kelly", "Howard", "Ward", "Cox",
    "Richardson", "Wood", "Watson", "Brooks", "Bennett", "Gray", "Hughes", "Price", "Sanders",
    "Myers", "Long", "Ross", "Foster", "Powell", "Jenkins", "Perry", "Russell", "Sullivan",
    "Fisher", "Hayes", "Graham", "Wallace", "Hamilton", "Fraser", "MacLeod", "O'Brien", "Byrne",
    "Doyle", "Gallagher", "Hughes-Jones", "Patterson", "Fletcher", "Holmes", "Chapman",
    "Martinez", "Hernandez", "Lopez", "Nguyen", "Chen", "Wang", "Kim", "Okoye", "Singh",
    "Rahman", "Tremblay", "Gagnon",
  ],
};

// prettier-ignore
const INDIAN: NamePool = {
  first: [
    "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Krishna", "Ishaan",
    "Shaurya", "Rohan", "Kabir", "Ananya", "Diya", "Aadhya", "Saanvi", "Pari", "Anika", "Navya",
    "Myra", "Sara", "Ira", "Kavya", "Meera", "Rahul", "Vikram", "Siddharth", "Karthik", "Pranav",
    "Nikhil", "Varun", "Harsh", "Deepak", "Suresh", "Rajesh", "Anil", "Pooja", "Neha", "Sneha",
    "Divya", "Lakshmi", "Shreya", "Priyanka", "Swati", "Nandini", "Revathi", "Gayatri", "Tanvi",
    "Aishwarya", "Bhavna", "Farhan", "Imran", "Zoya", "Ayesha", "Harpreet", "Gurpreet",
    "Manpreet", "Joseph", "Anitha", "Rakesh",
  ],
  last: [
    "Sharma", "Verma", "Gupta", "Patel", "Reddy", "Iyer", "Nair", "Menon", "Rao", "Kumar",
    "Singh", "Joshi", "Desai", "Mehta", "Shah", "Kapoor", "Malhotra", "Chopra", "Bose",
    "Banerjee", "Chatterjee", "Mukherjee", "Das", "Ghosh", "Pillai", "Krishnan", "Subramanian",
    "Venkatesan", "Naidu", "Choudhary", "Agarwal", "Bansal", "Jain", "Saxena", "Tiwari",
    "Mishra", "Pandey", "Dubey", "Kulkarni", "Deshpande", "Patil", "Gowda", "Hegde", "Shetty",
    "Kamath", "Bhatt", "Trivedi", "Sinha", "Thakur", "Ahmed", "Khan", "Siddiqui", "Qureshi",
    "Fernandes", "D'Souza", "Gill", "Sandhu", "Dhillon", "Arora", "Sethi",
  ],
};

// prettier-ignore
const GERMAN: NamePool = {
  first: [
    "Lukas", "Leon", "Finn", "Jonas", "Paul", "Elias", "Felix", "Maximilian", "Moritz", "Tim",
    "Jan", "Niklas", "Tobias", "Florian", "Sebastian", "Stefan", "Markus", "Andreas", "Matthias",
    "Jürgen", "Emma", "Mia", "Hannah", "Lena", "Lea", "Anna", "Marie", "Laura", "Julia", "Sophie",
    "Katharina", "Johanna", "Clara", "Charlotte", "Franziska", "Sabine", "Petra", "Anja",
    "Melanie", "Jana", "Greta", "Ida", "Frieda", "Malte", "Henrik",
  ],
  last: [
    "Müller", "Schmidt", "Schneider", "Fischer", "Weber", "Meyer", "Wagner", "Becker", "Schulz",
    "Hoffmann", "Schäfer", "Koch", "Bauer", "Richter", "Klein", "Wolf", "Schröder", "Neumann",
    "Schwarz", "Zimmermann", "Braun", "Krüger", "Hofmann", "Hartmann", "Lange", "Schmitt",
    "Werner", "Krause", "Meier", "Lehmann", "Schmid", "Schulze", "Maier", "Köhler", "Herrmann",
    "König", "Walter", "Mayer", "Huber", "Kaiser", "Fuchs", "Peters", "Lang", "Scholz", "Möller",
  ],
};

// prettier-ignore
const FRENCH: NamePool = {
  first: [
    "Gabriel", "Léo", "Raphaël", "Louis", "Arthur", "Jules", "Hugo", "Lucas", "Adam", "Nathan",
    "Théo", "Mathis", "Antoine", "Julien", "Nicolas", "Pierre", "Thomas", "Maxime", "Baptiste",
    "Olivier", "Louise", "Jade", "Alice", "Chloé", "Léa", "Manon", "Camille", "Inès", "Juliette",
    "Zoé", "Sarah", "Margaux", "Elise", "Pauline", "Céline", "Amélie", "Aurélie", "Mathilde",
    "Océane", "Claire", "Yasmine", "Karim", "Mehdi", "Sofiane", "Aïcha",
  ],
  last: [
    "Martin", "Bernard", "Dubois", "Thomas", "Robert", "Richard", "Petit", "Durand", "Leroy",
    "Moreau", "Simon", "Laurent", "Lefebvre", "Michel", "Garcia", "David", "Bertrand", "Roux",
    "Vincent", "Fournier", "Morel", "Girard", "André", "Lefèvre", "Mercier", "Dupont", "Lambert",
    "Bonnet", "François", "Martinez", "Legrand", "Garnier", "Faure", "Rousseau", "Blanc",
    "Guerin", "Muller", "Henry", "Roussel", "Nicolas", "Perrin", "Morin", "Mathieu", "Clément",
    "Gauthier",
  ],
};

// prettier-ignore
const DUTCH: NamePool = {
  first: [
    "Daan", "Sem", "Lucas", "Levi", "Finn", "Milan", "Bram", "Thijs", "Ruben", "Jesse", "Lars",
    "Stijn", "Joost", "Pieter", "Wouter", "Sanne", "Emma", "Julia", "Tess", "Sophie", "Anna",
    "Fleur", "Lotte", "Noor", "Eva", "Femke", "Lieke", "Maud", "Iris", "Anouk", "Sven", "Koen",
    "Mila", "Roos", "Jeroen",
  ],
  last: [
    "de Jong", "Jansen", "de Vries", "van den Berg", "van Dijk", "Bakker", "Janssen", "Visser",
    "Smit", "Meijer", "de Boer", "Mulder", "de Groot", "Bos", "Vos", "Peters", "Hendriks",
    "van Leeuwen", "Dekker", "Brouwer", "de Wit", "Dijkstra", "Smits", "de Graaf", "van der Meer",
    "van der Linden", "Kok", "Jacobs", "de Haan", "Vermeulen", "van den Heuvel", "Verhoeven",
    "Kuipers", "Postma", "Willems",
  ],
};

// prettier-ignore
const SINGAPOREAN: NamePool = {
  first: [
    "Wei Ling", "Jun Jie", "Xin Yi", "Kai Wen", "Hui Min", "Zhi Hao", "Jia Hui", "Wen Jie",
    "Shu Ting", "Yong Sheng", "Mei Ling", "Jia Wei", "Li Ting", "Ming Hui", "Siti", "Nurul",
    "Aisyah", "Farah", "Hafiz", "Irfan", "Rizwan", "Faizal", "Priya", "Kavitha", "Arun",
    "Ganesh", "Lakshmi", "Rajan", "Daniel", "Rachel", "Joshua", "Natalie", "Ethan", "Chloe",
    "Marcus",
  ],
  last: [
    "Tan", "Lim", "Lee", "Ng", "Ong", "Wong", "Goh", "Chua", "Chan", "Koh", "Teo", "Ang", "Yeo",
    "Tay", "Ho", "Low", "Toh", "Sim", "Chong", "Chia", "Seah", "Foo", "Yap", "Quek", "Bin Ahmad",
    "Binte Ismail", "Abdullah", "Rahman", "Hassan", "Pillai", "Nair", "Raj", "Krishnan",
    "Subramaniam", "Fernandez",
  ],
};

// prettier-ignore
const BRAZILIAN: NamePool = {
  first: [
    "Miguel", "Arthur", "Gael", "Heitor", "Théo", "Davi", "Gabriel", "Bernardo", "Samuel",
    "João", "Pedro", "Lucas", "Rafael", "Gustavo", "Felipe", "Thiago", "Bruno", "Leonardo",
    "Matheus", "Rodrigo", "Helena", "Alice", "Laura", "Maria", "Valentina", "Heloísa", "Júlia",
    "Beatriz", "Mariana", "Larissa", "Camila", "Fernanda", "Gabriela", "Letícia", "Isabela",
    "Juliana", "Amanda", "Bianca", "Lívia", "Renata",
  ],
  last: [
    "Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Ferreira", "Alves", "Pereira", "Lima",
    "Gomes", "Costa", "Ribeiro", "Martins", "Carvalho", "Almeida", "Lopes", "Soares",
    "Fernandes", "Vieira", "Barbosa", "Rocha", "Dias", "Nascimento", "Andrade", "Moreira",
    "Nunes", "Marques", "Machado", "Mendes", "Freitas", "Cardoso", "Ramos", "Gonçalves",
    "Santana", "Teixeira", "Araújo", "Pinto", "Correia", "Cavalcanti", "Monteiro",
  ],
};

const POOLS_BY_COUNTRY: Readonly<Record<string, NamePool>> = {
  US: ENGLISH,
  GB: ENGLISH,
  CA: ENGLISH,
  AU: ENGLISH,
  IN: INDIAN,
  DE: GERMAN,
  FR: FRENCH,
  NL: DUTCH,
  SG: SINGAPOREAN,
  BR: BRAZILIAN,
};

/** The name pool for a country. Throws for a country without one, which is a programming error. */
export function namePoolFor(countryCode: string): NamePool {
  const pool = POOLS_BY_COUNTRY[countryCode];
  if (pool === undefined) {
    throw new Error(`no name pool for country ${countryCode}`);
  }
  return pool;
}
