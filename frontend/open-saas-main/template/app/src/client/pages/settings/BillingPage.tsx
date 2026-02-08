import { type AuthUser } from "wasp/auth";
import { useQuery, useAction, getCreditUsageHistory, getBillingHistory, getSubscriptionPlans, syncSubscription, cancelSubscription, getTenantInfo } from "wasp/client/operations";
import { useState, useEffect } from "react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { PayPalButtonWrapper } from "../../components/billing/PayPalButtonWrapper";
import { SubscriptionTier } from "../../../payment/plans";
import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { 
  CreditCard, 
  Download, 
  Loader2,
  Check,
  Zap,
  Briefcase,
  AlertTriangle,
  Info,
  Calendar,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { useToast } from "../../hooks/use-toast";

import { CREDIT_PACKAGES } from "../../../shared/billing";

export default function BillingPage({ user }: { user: AuthUser }) {
  const { data: creditUsageHistory, isLoading: isLoadingUsage } = useQuery(getCreditUsageHistory);
  // const { data: billingHistory, isLoading: isLoadingBilling } = useQuery(getBillingHistory);
  const { data: subscriptionPlans, isLoading: isLoadingPlans } = useQuery(getSubscriptionPlans);
  const { data: tenantInfo } = useQuery(getTenantInfo);

  const [paymentStartDate, setPaymentStartDate] = useState("");
  const [paymentEndDate, setPaymentEndDate] = useState("");
  const [usageStartDate, setUsageStartDate] = useState("");
  const [usageEndDate, setUsageEndDate] = useState("");
  
  const [paymentPage, setPaymentPage] = useState(1);
  const [usagePage, setUsagePage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => { setPaymentPage(1); }, [paymentStartDate, paymentEndDate]);
  useEffect(() => { setUsagePage(1); }, [usageStartDate, usageEndDate]);

  const filterByDate = (items: any[], start: string, end: string) => {
    if (!start && !end) return items;
    return items.filter(item => {
        const itemDate = new Date(item.createdAt);
        itemDate.setHours(0, 0, 0, 0);
        let matches = true;
        if (start) {
            const [sy, sm, sd] = start.split('-').map(Number);
            const s = new Date(sy, sm - 1, sd);
            matches = matches && itemDate.getTime() >= s.getTime();
        }
        if (end) {
            const [ey, em, ed] = end.split('-').map(Number);
            const e = new Date(ey, em - 1, ed);
            matches = matches && itemDate.getTime() <= e.getTime();
        }
        return matches;
    });
  };

  const rawPaymentItems = (creditUsageHistory || []).filter((item: any) => item.amount > 0 && item.type !== 'REFUND');
  const rawUsageItems = (creditUsageHistory || []).filter((item: any) => item.amount < 0 || item.type === 'REFUND');

  const paymentHistoryItems = filterByDate(rawPaymentItems, paymentStartDate, paymentEndDate);
  const usageLogItems = filterByDate(rawUsageItems, usageStartDate, usageEndDate);

  const paymentTotalPages = Math.ceil(paymentHistoryItems.length / itemsPerPage);
  const paginatedPaymentItems = paymentHistoryItems.slice(
    (paymentPage - 1) * itemsPerPage,
    paymentPage * itemsPerPage
  );

  const usageTotalPages = Math.ceil(usageLogItems.length / itemsPerPage);
  const paginatedUsageItems = usageLogItems.slice(
    (usagePage - 1) * itemsPerPage,
    usagePage * itemsPerPage
  );

  const renderDateFilter = (startDate: string, setStartDate: any, endDate: string, setEndDate: any) => (
    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900/50 p-1.5 rounded-md border border-slate-200 dark:border-slate-800">
        <Calendar className="ml-2 h-4 w-4 text-slate-500" />
        <div className="flex items-center gap-1">
            <div className="relative">
                <Input 
                    type="date" 
                    className="w-[110px] h-8 text-xs bg-transparent border-0 focus-visible:ring-0 p-0 text-slate-600 dark:text-slate-300 font-mono cursor-pointer"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    onClick={(e) => {
                        try { e.currentTarget.showPicker(); } catch (err) {}
                    }}
                />
            </div>
            <span className="text-slate-400">-</span>
            <div className="relative">
                <Input 
                    type="date" 
                    className="w-[110px] h-8 text-xs bg-transparent border-0 focus-visible:ring-0 p-0 text-slate-600 dark:text-slate-300 font-mono cursor-pointer"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    onClick={(e) => {
                        try { e.currentTarget.showPicker(); } catch (err) {}
                    }}
                />
            </div>
        </div>
        {(startDate || endDate) && (
            <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 w-6 p-0 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full"
                onClick={() => { setStartDate(""); setEndDate(""); }}
            >
                <span className="text-xs text-slate-500">×</span>
            </Button>
        )}
    </div>
  );

  const syncSub = useAction(syncSubscription);
  const cancelSub = useAction(cancelSubscription);
  const { toast } = useToast();
  
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [isPurchaseOpen, setIsPurchaseOpen] = useState(false);
  
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);
  const [isSubscribeOpen, setIsSubscribeOpen] = useState(false);

  // Transaction Details State
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Cancellation State
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [cancelConfirmText, setCancelConfirmText] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  const handleBuyClick = (packageId: string) => {
    setSelectedPackage(packageId);
    setIsPurchaseOpen(true);
  };

  const handleSubscribeClick = (plan: any) => {
    setSelectedPlan(plan);
    setIsSubscribeOpen(true);
  };

  const handleDowngradeClick = () => {
    setCancelConfirmText("");
    setIsCancelOpen(true);
  };

  const handleCancelSubscription = async () => {
    if (cancelConfirmText !== "Bye bye SecureTag") return;
    
    try {
      setIsCancelling(true);
      await cancelSub(undefined);
      toast({
        title: "Subscription Cancelled",
        description: "You have returned to the Free plan. You lost access to premium features.",
      });
      setIsCancelOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo cancelar la suscripción. Intenta de nuevo.",
        variant: "destructive"
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const handlePurchaseSuccess = (_newCredits: number) => {
    setIsPurchaseOpen(false);
  };

  const handleSubscriptionSuccess = async (subscriptionId: string) => {
    try {
      await syncSub({ subscriptionId, planId: selectedPlan.id });
      toast({
        title: "Suscripción Activada",
        description: `Bienvenido al plan ${selectedPlan.name}.`,
      });
      setIsSubscribeOpen(false);
    } catch (error) {
      toast({
        title: "Error de Sincronización",
        description: "El pago fue exitoso pero hubo un error actualizando tu cuenta. Contacta soporte.",
        variant: "destructive"
      });
    }
  };

  const handleShowDetails = (transaction: any) => {
    setSelectedTransaction(transaction);
    setIsDetailsOpen(true);
  };

  const selectedPkgDetails = CREDIT_PACKAGES.find(p => p.id === selectedPackage);

  const isCurrentPlan = (tier: string) => {
    if (!user.subscriptionTier && tier === SubscriptionTier.FREE) return true;
    return user.subscriptionTier === tier;
  };

  const translateDescription = (desc: string) => {
    if (!desc) return '';
    if (desc === "Compra de paquete de créditos") return "Credit package purchase";
    if (desc === "Reembolso automático por servicios no utilizados o fallidos") return "Automatic refund for unused or failed services";
    
    if (desc.startsWith("Créditos mensuales plan")) {
       // e.g. "Créditos mensuales plan PREMIUM" -> "Monthly credits for PREMIUM plan"
       return desc.replace("Créditos mensuales plan", "Monthly credits for") + " plan";
    }
    
    // "Compra de 100 Créditos Securetag" -> "Purchase of 100 Securetag Credits"
    const purchaseMatch = desc.match(/^Compra de (\d+) Créditos Securetag$/);
    if (purchaseMatch) {
       return `Purchase of ${purchaseMatch[1]} Securetag Credits`;
    }
    
    return desc;
  };

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing & Credits</h1>
        <p className="text-muted-foreground mt-1">
          Manage your subscription, credit balance, and view billing history.
        </p>
      </div>

      {/* Subscription Plans Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-yellow-500" />
          <h2 className="text-2xl font-bold tracking-tight">Subscription Plans</h2>
        </div>
        
        {isLoadingPlans ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4 items-start">
              {/* Free Plan Card (Static) */}
              <Card className={`relative flex flex-col h-full ${isCurrentPlan(SubscriptionTier.FREE) ? 'border-primary' : ''}`}>
                <CardHeader>
                  <CardTitle className="text-2xl">Free</CardTitle>
                  <CardDescription>Try SecureTag for free with limited features.</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                  <div className="text-3xl font-bold">$0 <span className="text-sm font-normal text-muted-foreground">/mo</span></div>
                  <ul className="space-y-2 text-sm">
                     <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500"/> Basic scans </li>
                     <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500"/> Community support</li>
                  </ul>
                </CardContent>
                <CardFooter>
                   <Button 
                      className="w-full" 
                      variant="outline" 
                      disabled={isCurrentPlan(SubscriptionTier.FREE)}
                      onClick={handleDowngradeClick}
                   >
                      {isCurrentPlan(SubscriptionTier.FREE) ? 'Current Plan' : 'Downgrade'}
                   </Button>
                </CardFooter>
              </Card>

              {/* Paid Plans */}
              {subscriptionPlans?.map((plan: any) => (
                 <Card 
                  key={plan.id} 
                  className={`relative flex flex-col h-full transition-all duration-300 ${
                    plan.popular 
                      ? 'border-2 border-fuchsia-600 shadow-xl scale-105 z-10 bg-card' 
                      : 'border-border/50 hover:border-primary/50'
                  } ${isCurrentPlan(plan.tier) ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <Badge className="px-4 py-1 text-sm font-bold shadow-lg bg-fuchsia-600 text-white">
                        Recomendado
                      </Badge>
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 space-y-4">
                    <div className="text-3xl font-bold">${plan.price} <span className="text-sm font-normal text-muted-foreground">/mo</span></div>
                    <ul className="space-y-2 text-sm">
                       {plan.features.map((feat: string, i: number) => (
                         <li key={i} className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500"/> {feat}</li>
                       ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                     <Button 
                      className={`w-full ${plan.popular ? 'bg-fuchsia-600 hover:bg-fuchsia-700' : ''}`} 
                      onClick={() => handleSubscribeClick(plan)}
                      disabled={isCurrentPlan(plan.tier)}
                     >
                        {isCurrentPlan(plan.tier) ? 'Current Plan' : `Subscribe to ${plan.name}`}
                     </Button>
                  </CardFooter>
                </Card>
              ))}
          </div>
        )}
      </div>

      <div className="border-t pt-8"></div>

      {/* Credit Packages Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-blue-500" />
          <h2 className="text-2xl font-bold tracking-tight">Credit Packages</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4 items-start">
          {CREDIT_PACKAGES.map((pkg) => (
            <Card 
              key={pkg.id} 
              className={`relative flex flex-col transition-all duration-300 ${
                pkg.popular 
                  ? 'border-2 border-blue-600 shadow-xl scale-105 z-10 bg-card' 
                  : 'border-border/50 hover:border-primary/50 hover:shadow-md bg-card/50 opacity-90 hover:opacity-100 mt-4'
              }`}
            >
              {pkg.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Badge className="px-4 py-1 text-sm font-bold shadow-lg bg-blue-600 text-white">
                    Best Value
                  </Badge>
                </div>
              )}
              <CardHeader className="pb-2 text-center">
                <CardTitle className="text-4xl font-extrabold tracking-tight">{pkg.credits}</CardTitle>
                <CardDescription className="text-xs font-semibold uppercase tracking-widest">Credits</CardDescription>
              </CardHeader>
              <CardContent className="text-center pb-4 flex-1">
                <div className="flex justify-center items-baseline gap-1">
                  <span className="text-lg text-muted-foreground font-medium">$</span>
                  <span className="text-3xl font-bold">{pkg.price}</span>
                </div>
              </CardContent>
              <CardFooter className="pt-2">
                <Button 
                  className={`w-full font-semibold transition-all ${
                    pkg.popular ? 'shadow-lg hover:shadow-blue-600/25 bg-blue-600 hover:bg-blue-700 text-white border-transparent' : ''
                  }`} 
                  size={pkg.popular ? "lg" : "default"}
                  variant={pkg.popular ? "default" : "outline"}
                  onClick={() => handleBuyClick(pkg.id)}
                >
                  Buy Credits
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>

      {/* Info & Methods Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
          <Card className="bg-black text-white">
            <CardHeader className="pb-2">
              <CardDescription className="text-gray-400">Current Balance</CardDescription>
              <CardTitle className="text-4xl">{tenantInfo?.credits_balance ?? user.credits} Credits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm opacity-90">
                Use credits to run Next Generation SAST scans, Generate AI rules & get Double checks.
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment Method</CardTitle>
              <CardDescription>Manage how you pay for credits.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4 border p-4 rounded-md">
                <CreditCard className="h-6 w-6 text-muted-foreground" />
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-none">PayPal</p>
                  <p className="text-sm text-muted-foreground">Secure Payments</p>
                </div>
              </div>
            </CardContent>
          </Card>
      </div>

      {/* Date Filter & Payment History Section */}
      <h2 className="text-xl font-bold tracking-tight mb-2">Transaction History</h2>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="space-y-1">
            <CardTitle>Payment History</CardTitle>
            <CardDescription>View your real-money transactions and invoices.</CardDescription>
          </div>
          {renderDateFilter(paymentStartDate, setPaymentStartDate, paymentEndDate, setPaymentEndDate)}
        </CardHeader>
        <CardContent>
          {isLoadingUsage ? (
            <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Credits</TableHead>
                  <TableHead className="text-right">Invoice</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentHistoryItems.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{new Date(item.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {translateDescription((item.description || (item.payment?.paymentType === 'SUBSCRIPTION_RENEWAL' ? 'Subscription Renewal' : 'Credit Purchase')).replace(/\s*\(PayPal:.*\)/, ''))}
                        </span>
                        <span className="text-xs text-muted-foreground">{item.payment?.paypalOrderId || 'Automatic Grant'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={item.payment?.status === 'COMPLETED' || !item.payment ? "bg-green-50 text-green-700 border-green-200" : "bg-yellow-50 text-yellow-700 border-yellow-200"}>
                         {item.payment?.status || 'APPLIED'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {item.payment ? `$${item.payment.amount} ${item.payment.currency || 'USD'}` : '-'}
                    </TableCell>
                    <TableCell className="text-right text-green-600 font-bold">
                      +{item.amount}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.payment ? (
                        <Button variant="ghost" size="sm" asChild>
                            <Link to={`/billing/receipt/${item.payment.id}`} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4" />
                            </Link>
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                 {!paymentHistoryItems.length && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">No payments found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Credit Usage History Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="space-y-1">
            <CardTitle>Credit Usage Log</CardTitle>
            <CardDescription>Detailed log of how your credits are consumed.</CardDescription>
          </div>
          {renderDateFilter(usageStartDate, setUsageStartDate, usageEndDate, setUsageEndDate)}
        </CardHeader>
        <CardContent>
          {isLoadingUsage ? (
            <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead className="text-right">Credits Change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUsageItems.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{new Date(item.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{translateDescription(item.description || item.type)}</span>
                        {item.metadata && (
                           <div className="flex items-center gap-1 mt-1 cursor-pointer text-xs text-blue-600 hover:underline w-fit" onClick={() => handleShowDetails(item)}>
                              <Info className="h-3 w-3" />
                              <span>View breakdown</span>
                           </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className={`text-right font-bold ${item.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {item.amount > 0 ? '+' : ''}{item.amount}
                    </TableCell>
                  </TableRow>
                ))}
                 {!paginatedUsageItems.length && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">No credit usage found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
          
          {usageTotalPages > 1 && (
            <div className="p-4 border-t border-slate-200 dark:border-slate-900 flex items-center justify-between bg-slate-50 dark:bg-black/50">
                <span className="text-xs text-slate-500 font-mono">
                    Page {usagePage} of {usageTotalPages}
                </span>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setUsagePage(p => Math.max(1, p - 1))} disabled={usagePage === 1} className="h-8 w-8 p-0">
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setUsagePage(p => Math.min(usageTotalPages, p + 1))} disabled={usagePage === usageTotalPages} className="h-8 w-8 p-0">
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Purchase Dialog (Credits) */}
      <Dialog open={isPurchaseOpen} onOpenChange={setIsPurchaseOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Complete Purchase</DialogTitle>
            <DialogDescription>
              Buy {selectedPkgDetails?.credits} credits for ${selectedPkgDetails?.price}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedPackage && (
               <PayPalScriptProvider options={{ 
                  clientId: import.meta.env.REACT_APP_PAYPAL_CLIENT_ID || "",
                  currency: "USD",
                  intent: "capture"
                }}>
                  <PayPalButtonWrapper 
                    packageId={selectedPackage} 
                    onSuccess={handlePurchaseSuccess}
                  />
               </PayPalScriptProvider>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Subscribe Dialog (Plans) */}
      <Dialog open={isSubscribeOpen} onOpenChange={setIsSubscribeOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{selectedPlan?.name} subscription</DialogTitle>
            <DialogDescription>
              Subscribe for ${selectedPlan?.price}/month. Cancel any time.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 w-full">
            {selectedPlan && (
               <PayPalScriptProvider options={{ 
                  clientId: import.meta.env.REACT_APP_PAYPAL_CLIENT_ID || "",
                  currency: "USD",
                  intent: "subscription",
                  vault: true
                }}>
                   <PayPalButtons 
                      style={{ label: 'subscribe' }}
                      createSubscription={(_data, actions) => {
                        return actions.subscription.create({
                          plan_id: selectedPlan.paypalPlanId
                        });
                      }}
                      onApprove={async (data, _actions) => {
                        if (data.subscriptionID) {
                            await handleSubscriptionSuccess(data.subscriptionID);
                        }
                      }}
                      onError={(err) => {
                        console.error("PayPal Subscription Error:", err);
                        toast({
                          title: "Error de Configuración",
                          description: "No se pudo iniciar la suscripción. Verifica que el PLAN ID sea válido en PayPal Sandbox.",
                          variant: "destructive"
                        });
                      }}
                      onCancel={() => {
                        toast({
                          title: "Cancelado",
                          description: "Proceso de suscripción cancelado.",
                        });
                      }}
                   />
               </PayPalScriptProvider>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancellation Dialog */}
      <Dialog open={isCancelOpen} onOpenChange={setIsCancelOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" /> Cancel Subscription
            </DialogTitle>
            <DialogDescription className="space-y-2 pt-2">
              <p>
                ¿Are you sure you want to cancel your subscription?
                <strong> You will lose access to all premium features immediately.</strong>
              </p>
              <p>
                To confirm, type <strong> Bye bye SecureTag</strong> in the field below.
              </p>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="cancel-confirm" className="sr-only">Confirmation</Label>
            <Input 
              id="cancel-confirm"
              value={cancelConfirmText}
              onChange={(e) => setCancelConfirmText(e.target.value)}
              placeholder="Type 'Bye bye SecureTag' to confirm"
              className="border-red-200 focus:border-red-500"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCancelOpen(false)}>Back</Button>
            <Button 
              variant="destructive" 
              onClick={handleCancelSubscription}
              disabled={cancelConfirmText !== "Bye bye SecureTag" || isCancelling}
            >
              {isCancelling ? <Loader2 className="animate-spin h-4 w-4" /> : "Confirm Cancellation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transaction Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
            <DialogDescription>
              Breakdown of credits used for this operation.
            </DialogDescription>
          </DialogHeader>
          
          {selectedTransaction && selectedTransaction.metadata && (
             <div className="space-y-4 py-2">
                <div className="flex justify-between items-center border-b pb-2">
                   <span className="text-sm font-medium">Operation</span>
                   <span className="text-sm text-muted-foreground">{selectedTransaction.type}</span>
                </div>
                
                {selectedTransaction.metadata.fileName && (
                   <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">File</span>
                      <span className="text-sm font-medium max-w-[200px] truncate" title={selectedTransaction.metadata.fileName}>
                        {selectedTransaction.metadata.fileName}
                      </span>
                   </div>
                )}

                {selectedTransaction.metadata.scanProfile && (
                   <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Profile</span>
                      <Badge variant="outline" className="text-xs">{selectedTransaction.metadata.scanProfile}</Badge>
                   </div>
                )}

                {selectedTransaction.metadata.breakdown && (
                  <div className="bg-black border border-slate-800 p-3 rounded-md space-y-2 mt-2 text-slate-300">
                     <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Cost Breakdown</p>
                     
                     <div className="flex justify-between text-sm">
                        <span>Base Scan Cost</span>
                        <span>{selectedTransaction.metadata.breakdown.base} credits</span>
                     </div>

                     {selectedTransaction.metadata.breakdown.customRules && (
                        <div className="space-y-1 mt-2">
                           <div className="flex justify-between text-sm text-blue-400 font-medium">
                              <span>
                                Custom Rules 
                                {selectedTransaction.metadata.breakdown.customRules.qty ? ` (${selectedTransaction.metadata.breakdown.customRules.qty}x)` : ''}
                              </span>
                              <span>+{selectedTransaction.metadata.breakdown.customRules.total || selectedTransaction.metadata.breakdown.customRules.cost} credits</span>
                           </div>
                           <div className="pl-2 text-xs text-slate-500 space-y-1 border-l-2 border-slate-700 ml-1">
                                <div className="flex justify-between">
                                    <span>Processing Fee</span>
                                    <span>{selectedTransaction.metadata.breakdown.customRules.processing} CR</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Success Fee</span>
                                    <span>{selectedTransaction.metadata.breakdown.customRules.potentialSuccess} CR</span>
                                </div>
                           </div>
                        </div>
                     )}

                     {selectedTransaction.metadata.breakdown.doubleCheck && (
                        <div className="flex justify-between text-sm text-purple-400 mt-1">
                           <span>
                             Double Check 
                             {typeof selectedTransaction.metadata.breakdown.doubleCheck === 'object' && selectedTransaction.metadata.breakdown.doubleCheck.level 
                                ? ` (${selectedTransaction.metadata.breakdown.doubleCheck.level})` 
                                : ''}
                           </span>
                           <span>
                             +{typeof selectedTransaction.metadata.breakdown.doubleCheck === 'object' 
                                ? selectedTransaction.metadata.breakdown.doubleCheck.cost 
                                : selectedTransaction.metadata.breakdown.doubleCheck} credits
                           </span>
                        </div>
                     )}
                  </div>
                )}

                <div className="flex justify-between items-center pt-2 border-t mt-2">
                   <span className="font-bold">Total</span>
                   <span className="font-bold text-lg text-red-600">{Math.abs(selectedTransaction.amount)} Credits</span>
                </div>
             </div>
          )}
          
          <DialogFooter>
             <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
