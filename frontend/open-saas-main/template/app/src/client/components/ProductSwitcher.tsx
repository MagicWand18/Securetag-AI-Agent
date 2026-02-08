import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "../utils";

export function ProductSwitcher() {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine current product based on path
  const getCurrentProduct = () => {
    const path = location.pathname;
    if (path.startsWith("/sast")) return "/sast";
    if (path.startsWith("/waf")) return "/waf";
    if (path.startsWith("/osint")) return "/osint";
    return "/dashboard"; // Default to General
  };

  const currentProduct = getCurrentProduct();

  const handleValueChange = (value: string) => {
    navigate(value);
  };

  return (
    <Select value={currentProduct} onValueChange={handleValueChange}>
      <SelectTrigger className="w-[200px] bg-background">
        <SelectValue placeholder="Select Product" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="/dashboard">General</SelectItem>
        <SelectItem value="/sast">SecureTag SAST</SelectItem>
        <SelectItem value="/waf">SecureTag WAF</SelectItem>
        <SelectItem value="/osint">SecureTag OSINT</SelectItem>
      </SelectContent>
    </Select>
  );
}
