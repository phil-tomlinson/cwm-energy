import FoodView from "./FoodView";

export const metadata = {
  title: "Food | CWM Energy",
  description: "Log a week of meals and see your food footprint: what's on the plate, eating out versus cooking at home, and buying local.",
};

export default function FoodPage() {
  return <FoodView />;
}
