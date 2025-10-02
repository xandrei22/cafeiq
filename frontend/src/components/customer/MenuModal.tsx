const menuCategories = [
  // All hardcoded menu items removed - menu will now only show items from database
  // {
  //   title: "COFFEE",
  //   items: [
  //     { name: "Americano", description: "2 Shots Espresso and Water", price: "P85" },
  //     { name: "Cafe Latte", description: "2 Shots Espresso with Milk", price: "P105" },
  //     { name: "Spanish Latte", description: "2 Shots Espresso, Milk and sweetened condensed Milk", price: "P115" },
  //     { name: "Caramel Macchiato", description: "2 Shots Espresso, Milk and Caramel", price: "P145" },
  //     { name: "Mocha", description: "2 Shots Espresso, Milk and Chocolate", price: "P145" },
  //     { name: "White Mocha", description: "2 Shots Espresso, Milk and White Chocolate", price: "P145" },
  //     { name: "Dirty Strawberry Vanilla", description: "A shot of Espresso, strawberry syrup, Milk and Vanilla", price: "P145" },
  //     { name: "Toffee Nut Latte", description: "2 Shots Espresso, Milk and Toffee", price: "P135" },
  //     { name: "Butterscotch Latte", description: "2 Shots Espresso, Milk and Butterscotch", price: "P145" },
  //     { name: "Ube Latte", description: "1 Shot Espresso, Milk and ube foam.", price: "P120" }
  //   ]
  // },
  // {
  //   title: "SIGNATURE DRINKS",
  //   items: [
  //     { name: "Irish Creme Latte", description: "Espresso, Irish cream whiskey, and Whip Creme", price: "P170" },
  //     { name: "Sea Salt Creme Latte", description: "Espresso, Milk and Sea Salt creme", price: "P130" },
  //     { name: "The Monica", description: "A strong yet delicate Drink. (Espresso Based)", price: "P115" },
  //     { name: "Batangas Tablea", description: "Batangas cocoa traditionally made. (Hot ONLY)", price: "P145" },
  //     { name: "Ube Colada", description: "Ube, Coconut and Pineapple. (*ask for availability)", price: "P175" },
  //     { name: "Dazed Mocha", description: "Milk chocolate layered with Caramel and white chocolate", price: "P160" },
  //     { name: "Chai Tea Latte", description: "Black tea infused drink with Milk", price: "P130" },
  //     { name: "Butterbeer", description: "Cola, Butterscotch and butter extract.", price: "P140" }
  //   ]
  // },
  // {
  //   title: "MATCHA SERIES",
  //   items: [
  //     { name: "Matcha Latte", description: "Matcha and Milk", price: "P145" },
  //     { name: "Cloud Matcha", description: "Cloud Matcha Foam over Milk", price: "P150" },
  //     { name: "Dirty Matcha", description: "Matcha, Espresso and Milk", price: "P150" },
  //     { name: "Creamy Matcha", description: "High grade matcha, milk and cream foam", price: "P155" },
  //     { name: "Sea Salt Matcha Latte", description: "High grade matcha, milk and Sea Salt Creme", price: "P160" },
  //     { name: "Strawberry Matcha", description: "High grade matcha, milk and strawberry Foam", price: "P150" },
  //     { name: "Ube Matcha", description: "High grade matcha mixed with Ube in one drink", price: "P150" }
  //   ]
  // },
  // {
  //   title: "REFRESHING DRINKS",
  //   items: [
  //     { name: "Cherry Cola with Creme", description: "Soda, Cherry and Half & Half", price: "P160" },
  //     { name: "Lemon Soda", description: "Soda, Lemon and a touch of Mint", price: "P140" },
  //     { name: "Strawberry Soda", description: "Strawberry and Soda", price: "P140" },
  //     { name: "Cool Chamomile", description: "Iced Shaken Chamomile Tea, pineapple and amaretto Syrup", price: "P135" },
  //     { name: "Early Sunrise", description: "Orange Juice, Lemon, Grenadine and Soda", price: "P140" }
  //   ]
  // },
  // {
  //   title: "FRAPPE SERIES",
  //   items: [
  //     { name: "CARAMEL FRAP", description: "Caramel and Vanilla blended in Ice", price: "P165" },
  //     { name: "MOCHA FRAP", description: "Chocolate and milk blended with Ice", price: "P165" },
  //     { name: "WHITE MOCHA FRAP", description: "White choclate and milk blended with Ice", price: "P165" },
  //     { name: "BLACK FOREST FRAP", description: "Black forest chocolate blended with Ice", price: "P180" },
  //     { name: "CHOCO OREO FRAP", description: "Chocolate and Oreo mixed together", price: "P175" },
  //     { name: "STRAWBERRY OREO FRAP", description: "Strawberry, Vanilla and Oreo blended in Ice", price: "P175" },
  //     { name: "JAVA CHIP", description: "Dark chocolate blended with Ice.", price: "P180" }
  //   ]
  // },
  // {
  //   title: "BASIC COFFEE",
  //   items: [
  //     { name: "ICED COFFEE", description: "", price: "P50" },
  //     { name: "CARAMEL ICED COFFEE", description: "", price: "P65" },
  //     { name: "CHOCOLATE ICED COFFEE", description: "", price: "P65" },
  //     { name: "WHITE CHOCOLATE ICED COFFEE", description: "", price: "P65" },
  //     { name: "UBE ICED COFFEE", description: "", price: "P65" }
  //   ]
  // },
  // {
  //   title: "ADD ONS",
  //   items: [
  //     { name: "ESPRESSO SHOT", description: "", price: "P35" },
  //     { name: "SYRUP/SAUCE", description: "", price: "P20" },
  //     { name: "UPSIZE", description: "", price: "P30" },
  //     { name: "CREME", description: "", price: "P25" },
  //     { name: "SEA SALT CREME", description: "", price: "P30" }
  //   ]
  // },
  // {
  //   title: "SAUSAGE SANDWICH",
  //   items: [
  //     { name: "Classic Hotdog", description: "Classic Hotdog with bun", price: "P99/P130" },
  //     { name: "Frankfurters", description: "Premium Frankfurter sausage", price: "P99/P130" },
  //     { name: "Hungarian Sausage", description: "Savory Hungarian-style sausage", price: "P110/P160" },
  //     { name: "Cheesy Hungarian", description: "Hungarian sausage with cheese", price: "P115/P165" }
  //   ]
  // },
  // {
  //   title: "SAUCE OPTIONS",
  //   items: [
  //     { name: "Mauricios Special", description: "Our very own special sauce", price: "" },
  //     { name: "Chili Garlic Mayo", description: "Mayo and Chili Garlic", price: "" },
  //     { name: "Hoisin Sauce", description: "Siracha, Mayonnaise and Hoisin", price: "" },
  //     { name: "Mayonnaise", description: "Classic Mayonnaise", price: "" },
  //     { name: "Mayo Gochujang", description: "Honey, Mayo and Gochujang", price: "" },
  //   ]
  // }
];

interface MenuModalProps {
  show: boolean;
  onHide: () => void;
}

const MenuModal = ({ show, onHide }: MenuModalProps) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/30">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 overflow-y-auto max-h-[90vh] relative">
        <button
          className="absolute top-4 right-4 text-2xl text-gray-400 hover:text-gray-600"
          onClick={onHide}
        >
          &times;
        </button>
        <div className="p-6">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {menuCategories.map((category, idx) => (
              <div key={idx} className="mb-4">
                <h3 className="mb-4 text-xl font-semibold text-[#D4A762]">{category.title}</h3>
                <div>
                  {category.items.map((item, itemIdx) => (
                    <div key={itemIdx} className="flex justify-between items-start mb-3">
                      <div className="pr-3">
                        <h5 className="mb-1 font-medium">{item.name}</h5>
                        {item.description && (
                          <small className="text-gray-500 block">{item.description}</small>
                        )}
                      </div>
                      {item.price && (
                        <span className="font-bold text-[#D4A762] whitespace-nowrap">{item.price}</span>
                      )}
                    </div>
                  ))}
                  {category.note && (
                    <small className="text-gray-500 block mt-3">{category.note}</small>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MenuModal; 