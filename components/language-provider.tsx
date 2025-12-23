"use client"

import React, { createContext, useContext, useEffect, useState } from "react"

type Language = "en" | "pt"

type LanguageContextValue = {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Header
    "header.language": "Language",
    "header.english": "English",
    "header.portuguese": "Portuguese (Portugal)",
    "header.dashboard": "Dashboard",
    "header.newDevice": "New Device",
    "header.allDevices": "All Devices",
    "header.analytics": "Analytics",
    "header.subscription": "Subscription",
    "header.administration": "Administration",
    "header.subscriptions": "Subscriptions",
    "header.team": "Team",
    "header.trash": "Trash",
    "header.logout": "Logout",

    // New ticket page
    "page.newTicket.title": "New Repair Device",
    "page.newTicket.subtitle": "Enter customer and device information",
    "page.newTicket.customerDeviceInformation": "Customer & Device Information",
    "page.newTicket.print": "Print",
    "page.newTicket.connectPrinter": "Connect Printer",
    "page.newTicket.printerConnected": "Printer Connected",
    "page.newTicket.selectPrinter": "Select Printer",
    "page.newTicket.noPrinter": "No printer available",
    "page.newTicket.printing": "Printing...",
    "page.newTicket.printSuccess": "Print job sent successfully",
    "page.newTicket.printError": "Error printing. Please try again.",

    // Tickets page
    "page.tickets.title": "Devices Information",
    "page.tickets.subtitle": "Search and manage all device information",
    "page.tickets.print": "Print",

    // Trash page
    "page.trash.title": "Trash",
    "page.trash.subtitle": "Deleted devices - Restore or permanently delete",

    // NewRepairTicketForm labels
    "form.customerName": "Customer Name",
    "form.contactNumber": "Contact Number",
    "form.model": "Model",
    "form.imei": "IMEI Number",
    "form.serviceNames": "Service Name(s)",
    "form.price": "Price for Service",
    "form.technicianNotes": "Technician Notes",
    "form.condition": "Mobile Condition (On Arrival)",
    "form.createDeviceEntry": "Create Device Entry",
    "form.cancel": "Cancel",
    "form.device": "Device",
    "form.laptopSerialNumber": "Laptop Serial Number",
    "form.laptopSerialNumberPlaceholder": "Enter laptop serial number",
    "form.laptopSerialNumberHint": "Enter the laptop serial number",
    "form.warranty": "Warranty",
    "form.warrantyUntil30Days": "Warranty Until 30 days",
    "form.withoutWarranty": "Without Warranty",
    "form.repairNumber": "Repair Number (Auto-generated)",
    "form.repairNumberHint": "Unique repair number will be generated on server",
    "form.repairObservations": "Repair Observations",
    "form.repairObservationsPlaceholder": "Repair Observations",
    "form.equipmentCheck": "Equipment Check",
    "form.simCard": "SIM Card",
    "form.memoryCard": "Memory Card",
    "form.charger": "Charger",
    "form.battery": "Battery",
    "form.waterDamaged": "Water Damaged",

    // Service names
    "service.lcd": "LCD",
    "service.battery": "Battery",
    "service.chargingPort": "Charging Port",
    "service.microphone": "Microphone",
    "service.earSpeaker": "Ear speaker",
    "service.backCover": "Back cover",
    "service.wifiBluetooth": "Wifi/Bluetooth",
    "service.network": "Network",
    "service.software": "Software",
    "service.shutOff": "Shut off",

    // NewRepairTicketForm placeholders
    "placeholder.customerName": "John Doe",
    "placeholder.contactNumber": "+1 234 567 8900",
    "placeholder.model": "iPhone 14 Pro",
    "placeholder.imei": "123456789012345",
    "placeholder.price": "99.99",
    "placeholder.technicianNotes": "Describe the issue with the device...",
    "placeholder.condition": "e.g. Cracked screen, heavy scratches, water damage signs...",

    // Validation / alerts
    "error.imei.exact": "IMEI Number must be exactly 15 digits.",
    "error.imei.inline": "IMEI must be 15 digits (0-9).",
    "error.service.required": "Please select at least one service.",
    "error.device.notFound": "Device not found. It may have already been deleted.",

    // SearchRepairTickets
    "search.title": "Search Devices",
    "search.results": "Results",
    "search.results.device": "device",
    "search.results.devices": "devices",
    "search.searchLabel": "Search",
    "search.searchPlaceholder": "Enter search term...",
    "search.searchBy": "Search By",
    "search.filterByStatus": "Filter by Status",
    "search.noDevicesYet": "No repair devices yet.",
    "search.noDevicesMatch": "No devices found matching your search.",

    // Search fields
    "search.field.all": "All Fields",
    "search.field.name": "Customer Name",
    "search.field.contact": "Phone Number",
    "search.field.imei": "IMEI Number",
    "search.field.model": "Model",
    "search.field.service": "Service Name",
    "search.field.problem": "Problem",
    "search.field.condition": "Mobile Condition",
    "search.field.price": "Price",
    "search.field.status": "Status",
    "search.field.repairNumber": "Repair Number",
    "search.field.date": "Entry Date",

    // Status filter
    "status.all": "All Statuses",
    "status.pending": "Pending",
    "status.in_progress": "In Progress",
    "status.completed": "Completed",
    "status.delivered": "Out",

    // Ticket details
    "ticket.contact": "Contact:",
    "ticket.imei": "IMEI:",
    "ticket.model": "Model:",
    "ticket.service": "Service:",
    "ticket.technicianNotes": "Technician Notes:",
    "ticket.condition": "Mobile Condition (On Arrival):",
    "ticket.updateStatus": "Update Status:",
    "ticket.deleteTitle": "Delete Device",
    "ticket.deleteDescription": "Are you sure you want to delete the device entry for",
    "ticket.deleteConfirm": "Delete",
    "ticket.edit": "Edit",

    // Dashboard
    "dashboard.welcome": "Welcome back,",
    "dashboard.welcomeBack": "Welcome back,",
    "dashboard.subtitle": "Here's what's happening with your repair shop today.",
    "dashboard.whatsHappening": "Here's what's happening with your repair shop today.",
    "dashboard.recentDevicesInformation": "Recent Devices Information",
    "dashboard.noRepairDevicesYet": "No repair devices yet. Create your first device!",

    // Stats cards
    "stats.total.title": "Total Devices",
    "stats.total.subtitle": "All repair devices",
    "stats.totalDevices": "Total Devices",
    "stats.allRepairDevices": "All repair devices",
    "stats.pending.title": "Pending",
    "stats.pending.subtitle": "Awaiting service",
    "stats.awaitingService": "Awaiting service",
    "stats.inProgress.title": "In Progress",
    "stats.inProgress.subtitle": "Currently being completed",
    "stats.currentlyBeingCompleted": "Currently being completed",
    "stats.completed.title": "Completed",
    "stats.completed.subtitle": "Repairs finished",
    "stats.repairsFinished": "Repairs finished",
    "stats.out.title": "Out",
    "stats.out.subtitle": "Returned to customers",
    "stats.returnedToCustomers": "Returned to customers",

    // Recent devices list
    "recent.title": "Recent Devices Information",
    "recent.empty": "No repair devices yet. Create your first device!",
    "recent.conditionLabel": "Condition:",
    "recent.imei": "IMEI:",
    "recent.contact": "Contact:",

    // Team management
    "team.page.title": "Team Management",
    "team.page.subtitle": "Manage team members and assign roles",
    "team.members.title": "Team Members",
    "team.members.total": "{count} total members",
    "team.members.addButton": "+ Add Member",
    "team.add.title": "Add New Team Member",
    "team.add.fullName": "Full Name *",
    "team.add.email": "Email Address *",
    "team.add.emailHint": "Member will use this email to login",
    "team.add.role": "Role *",
    "team.add.role.member": "Team Member (Can view devices and add new devices)",
    "team.add.role.admin": "Admin (Full access)",
    "team.add.submit": "Add Team Member",
    "team.credentials.title": "Credentials Generated!",
    "team.credentials.subtitle": "Save these credentials for",
    "team.credentials.username": "Username",
    "team.credentials.password": "Password",
    "team.credentials.copy": "Copy",
    "team.credentials.usernameCopied": "Username copied to clipboard!",
    "team.credentials.passwordCopied": "Password copied to clipboard!",
    "team.credentials.warning": "⚠️ Please save these credentials. They cannot be retrieved later.",
    "team.member.role.admin": "Admin",
    "team.member.role.member": "Team Member",
    "team.member.changeRole": "Change role",
    "team.member.edit": "Edit",
    "team.member.delete": "Delete",
    "team.member.deleteTitle": "Delete Team Member",
    "team.member.deleteDescription": "Are you sure you want to delete",
    "team.member.deleteConfirm": "Delete",
    "team.member.editTitle": "Edit Team Member",
    "team.member.edit.fullName": "Full Name *",
    "team.member.edit.email": "Email Address *",
    "team.member.edit.role": "Role *",
    "team.member.edit.save": "Save Changes",
    "team.member.edit.cancel": "Cancel",
    "team.noPermission": "You don't have permission to access this page. Only administrators can manage team members.",

    // Subscription
    "subscription.title": "Subscription Management",
    "subscription.subtitle": "Manage your subscription, renew, or upgrade your plan",
    "subscription.freePlan": "Free Plan",
    "subscription.freePlanDays": "Free Plan - {days} Days",
    "subscription.freeTrialMessage": "You're currently on a FREE trial. Your trial will end on",
    "subscription.afterTrial": "After the trial ends, you'll need to subscribe to continue accessing your admin panel. All your data will be safe.",
    "subscription.paymentPending": "Payment Pending Approval",
    "subscription.paymentPendingMessage": "Your payment has been submitted and is pending admin approval.",
    "subscription.paymentPendingInfo": "Your admin panel will be activated within 15 minutes after admin approval. You'll receive a confirmation email once activated.",
    "subscription.notStarted": "Subscription Not Started Yet",
    "subscription.notStartedMessage": "Your subscription will start on",
    "subscription.notStartedInfo": "Your subscription is scheduled to begin after your free trial period ends.",
    "subscription.expired": "Subscription Expired",
    "subscription.expiredMessage": "Your subscription has expired. To continue accessing the admin panel, please renew your subscription by selecting a plan below.",
    "subscription.expiredInfo": "Your data is safe and will be available once you renew your subscription.",
    "subscription.current": "Current Subscription",
    "subscription.startDate": "Start Date",
    "subscription.endDate": "End Date",
    "subscription.plan": "Plan",
    "subscription.price": "Price",
    "subscription.renewSamePlan": "Renew Same Plan",
    "subscription.upgradeOrChange": "Upgrade or Change Plan",
    "subscription.choosePlan": "Choose Your Plan",
    "subscription.mostPopular": "Most Popular",
    "subscription.monthSubscription": "1 month subscription",
    "subscription.threeMonthSubscription": "3 months subscription",
    "subscription.sixMonthSubscription": "6 months subscription",
    "subscription.twelveMonthSubscription": "12 months subscription",
    "subscription.renewPlan": "Renew Plan",
    "subscription.subscribe": "Subscribe",
    "subscription.processing": "Processing...",
    "subscription.history": "Subscription History",
    "subscription.noHistory": "No subscription history available",
    "subscription.emailNotifications": "Email Notifications",
    "subscription.emailNotificationMessage": "You will receive an email notification 7 days before your subscription expires. Make sure your email address is up to date to receive these reminders.",
    "subscription.expiringSoon": "Subscription Expiring Soon",
    "subscription.expiringSoonMessage": "Your subscription will expire in {days} days. You will receive an email reminder 7 days before expiration.",
    "subscription.noActive": "No Active Subscription",
    "subscription.noActiveMessage": "Subscribe to a plan to start using the service",
    "subscription.freePlanDaysLeft": "Free Plan - {days} days left",
    "subscription.active": "Active",
    "subscription.pending": "Pending",
    "subscription.expiredStatus": "Subscription expired",
    "subscription.expiresIn": "Expires in {days} days",
    "subscription.paymentDeclined": "Payment Declined",
    "subscription.paymentApproved": "Payment Approved",
    "subscription.duration": "Duration",
    "subscription.months": "month(s)",
    "subscription.scheduled": "(Scheduled)",
    "subscription.scheduledMessage": "This subscription will start on {date} (the day after your free trial ends).",

    // Plan names
    "plan.monthly": "Monthly",
    "plan.starter": "Starter",
    "plan.professional": "Professional",
    "plan.enterprise": "Enterprise",
    "plan.threeMonths": "3 Months",
    "plan.sixMonths": "6 Months",
    "plan.twelveMonths": "12 Months",

    // Plan features
    "feature.repairTicketManagement": "Repair Ticket Management",
    "feature.customerDatabase": "Customer Database",
    "feature.paymentProcessing": "Payment Processing",
    "feature.analyticsReports": "Analytics & Reports",
    "feature.emailSupport": "Email Support",
    "feature.teamManagement": "Team Management",
    "feature.everythingIn3Months": "Everything in 3 Months",
    "feature.advancedAnalytics": "Advanced Analytics",
    "feature.prioritySupport": "Priority Support",
    "feature.customReports": "Custom Reports",
    "feature.apiAccess": "API Access",
    "feature.dataExport": "Data Export",
    "feature.everythingIn6Months": "Everything in 6 Months",
    "feature.unlimitedTickets": "Unlimited Tickets",
    "feature.dedicatedSupport": "Dedicated Support",
    "feature.customIntegrations": "Custom Integrations",
    "feature.whiteLabelOptions": "White Label Options",
    "feature.advancedSecurity": "Advanced Security",

    // Analytics
    "analytics.title": "Analytics",
    "analytics.subtitle": "Comprehensive insights into your repair business",
    "analytics.totalDevices": "Total Devices",
    "analytics.allRepairDevices": "All repair devices",
    "analytics.totalRevenue": "Total Revenue",
    "analytics.fromAllCompleted": "From all completed repairs",
    "analytics.averagePrice": "Average Price",
    "analytics.perDeviceRepair": "Per device repair",
    "analytics.statusDistribution": "Status Distribution",
    "analytics.pending": "Pending",
    "analytics.inProgress": "In Progress",
    "analytics.completed": "Completed",
    "analytics.delivered": "Delivered",
    "analytics.recentDevices": "Recent Devices",
    "analytics.noDevicesYet": "No devices yet. Create your first device entry!",

    // Table headers
    "table.date": "Date",
    "table.customer": "Customer",
    "table.contact": "Contact",
    "table.model": "Model",
    "table.imei": "IMEI",
    "table.service": "Service",
    "table.status": "Status",
    "table.price": "Price",
    "table.action": "Action",
  },
  pt: {
    // Header
    "header.language": "Idioma",
    "header.english": "Inglês",
    "header.portuguese": "Português (Portugal)",
    "header.dashboard": "Painel",
    "header.newDevice": "Novo Dispositivo",
    "header.allDevices": "Todos os Dispositivos",
    "header.analytics": "Análises",
    "header.subscription": "Subscrição",
    "header.administration": "Administração",
    "header.subscriptions": "Subscrições",
    "header.team": "Equipa",
    "header.trash": "Lixo",
    "header.logout": "Terminar sessão",

    // New ticket page
    "page.newTicket.title": "Novo dispositivo para reparação",
    "page.newTicket.subtitle": "Introduza os dados do cliente e do dispositivo",
    "page.newTicket.customerDeviceInformation": "Informação do Cliente e do Dispositivo",
    "page.newTicket.print": "Imprimir",
    "page.newTicket.connectPrinter": "Ligar Impressora",
    "page.newTicket.printerConnected": "Impressora Ligada",
    "page.newTicket.selectPrinter": "Selecionar Impressora",
    "page.newTicket.noPrinter": "Nenhuma impressora disponível",
    "page.newTicket.printing": "A imprimir...",
    "page.newTicket.printSuccess": "Trabalho de impressão enviado com sucesso",
    "page.newTicket.printError": "Erro ao imprimir. Por favor, tente novamente.",

    // Tickets page
    "page.tickets.title": "Informação dos dispositivos",
    "page.tickets.subtitle": "Pesquisar e gerir toda a informação dos dispositivos",
    "page.tickets.print": "Imprimir",

    // Trash page
    "page.trash.title": "Lixo",
    "page.trash.subtitle": "Dispositivos eliminados - Restaurar ou eliminar permanentemente",

    // NewRepairTicketForm labels
    "form.customerName": "Nome do cliente",
    "form.contactNumber": "Número de contacto",
    "form.model": "Modelo",
    "form.imei": "Número IMEI",
    "form.serviceNames": "Serviço(s)",
    "form.price": "Preço do serviço",
    "form.technicianNotes": "Notas do técnico",
    "form.condition": "Condição do telemóvel (à chegada)",
    "form.createDeviceEntry": "Criar registo do dispositivo",
    "form.cancel": "Cancelar",
    "form.device": "Dispositivo",
    "form.laptopSerialNumber": "Número de Série do Portátil",
    "form.laptopSerialNumberPlaceholder": "Introduza o número de série do portátil",
    "form.laptopSerialNumberHint": "Introduza o número de série do portátil",
    "form.warranty": "Garantia",
    "form.warrantyUntil30Days": "Garantia até 30 dias",
    "form.withoutWarranty": "Sem Garantia",
    "form.repairNumber": "Número de Reparação (Gerado automaticamente)",
    "form.repairNumberHint": "O número único de reparação será gerado no servidor",
    "form.repairObservations": "Observações de Reparação",
    "form.repairObservationsPlaceholder": "Observações de Reparação",
    "form.equipmentCheck": "Verificação de Equipamento",
    "form.simCard": "Cartão SIM",
    "form.memoryCard": "Cartão de Memória",
    "form.charger": "Carregador",
    "form.battery": "Bateria",
    "form.waterDamaged": "Danificado por Água",

    // Service names
    "service.lcd": "LCD",
    "service.battery": "Bateria",
    "service.chargingPort": "Porta de Carregamento",
    "service.microphone": "Microfone",
    "service.earSpeaker": "Altifalante",
    "service.backCover": "Tampa Traseira",
    "service.wifiBluetooth": "Wifi/Bluetooth",
    "service.network": "Rede",
    "service.software": "Software",
    "service.shutOff": "Desligar",

    // NewRepairTicketForm placeholders
    "placeholder.customerName": "João Silva",
    "placeholder.contactNumber": "+351 912 345 678",
    "placeholder.model": "iPhone 14 Pro",
    "placeholder.imei": "123456789012345",
    "placeholder.price": "99,99",
    "placeholder.technicianNotes": "Descreva o problema do dispositivo...",
    "placeholder.condition": "ex.: Ecrã rachado, riscos profundos, sinais de humidade...",

    // Validation / alerts
    "error.imei.exact": "O número IMEI deve ter exatamente 15 dígitos.",
    "error.imei.inline": "O IMEI deve ter 15 dígitos (0-9).",
    "error.service.required": "Selecione pelo menos um serviço.",
    "error.device.notFound": "Dispositivo não encontrado. Pode já ter sido apagado.",

    // SearchRepairTickets
    "search.title": "Pesquisar dispositivos",
    "search.results": "Resultados",
    "search.results.device": "dispositivo",
    "search.results.devices": "dispositivos",
    "search.searchLabel": "Pesquisa",
    "search.searchPlaceholder": "Introduza o termo de pesquisa...",
    "search.searchBy": "Pesquisar por",
    "search.filterByStatus": "Filtrar por estado",
    "search.noDevicesYet": "Ainda não existem dispositivos para reparação.",
    "search.noDevicesMatch": "Nenhum dispositivo encontrado para esta pesquisa.",

    // Search fields
    "search.field.all": "Todos os campos",
    "search.field.name": "Nome do cliente",
    "search.field.contact": "Número de telefone",
    "search.field.imei": "Número IMEI",
    "search.field.model": "Modelo",
    "search.field.service": "Serviço",
    "search.field.problem": "Problema",
    "search.field.condition": "Condição do telemóvel",
    "search.field.price": "Preço",
    "search.field.status": "Estado",
    "search.field.repairNumber": "Número de Reparação",
    "search.field.date": "Data de entrada",

    // Status filter
    "status.all": "Todos os estados",
    "status.pending": "Pendente",
    "status.in_progress": "Em curso",
    "status.completed": "Concluído",
    "status.delivered": "Entregue",

    // Ticket details
    "ticket.contact": "Contacto:",
    "ticket.imei": "IMEI:",
    "ticket.model": "Modelo:",
    "ticket.service": "Serviço:",
    "ticket.technicianNotes": "Notas do técnico:",
    "ticket.condition": "Condição do telemóvel (à chegada):",
    "ticket.updateStatus": "Atualizar estado:",
    "ticket.deleteTitle": "Eliminar dispositivo",
    "ticket.deleteDescription": "Tem a certeza de que pretende eliminar o registo do dispositivo de",
    "ticket.deleteConfirm": "Eliminar",
    "ticket.edit": "Editar",

    // Dashboard
    "dashboard.welcome": "Bem‑vindo de volta,",
    "dashboard.welcomeBack": "Bem‑vindo de volta,",
    "dashboard.subtitle": "Veja o que está a acontecer hoje na sua loja de reparações.",
    "dashboard.whatsHappening": "Veja o que está a acontecer hoje na sua loja de reparações.",
    "dashboard.recentDevicesInformation": "Informação de Dispositivos Recentes",
    "dashboard.noRepairDevicesYet": "Ainda não há dispositivos para reparação. Crie o seu primeiro dispositivo!",

    // Stats cards
    "stats.total.title": "Total de dispositivos",
    "stats.total.subtitle": "Todos os dispositivos em reparação",
    "stats.totalDevices": "Total de dispositivos",
    "stats.allRepairDevices": "Todos os dispositivos em reparação",
    "stats.pending.title": "Pendente",
    "stats.pending.subtitle": "A aguardar serviço",
    "stats.awaitingService": "A aguardar serviço",
    "stats.inProgress.title": "Em curso",
    "stats.inProgress.subtitle": "Atualmente em reparação",
    "stats.currentlyBeingCompleted": "Atualmente em reparação",
    "stats.completed.title": "Concluído",
    "stats.completed.subtitle": "Reparações finalizadas",
    "stats.repairsFinished": "Reparações finalizadas",
    "stats.out.title": "Entregue",
    "stats.out.subtitle": "Devolvidos aos clientes",
    "stats.returnedToCustomers": "Devolvidos aos clientes",

    // Recent devices list
    "recent.title": "Informação recente de dispositivos",
    "recent.empty": "Ainda não existem dispositivos para reparação. Crie o primeiro!",
    "recent.conditionLabel": "Condição:",
    "recent.imei": "IMEI:",
    "recent.contact": "Contacto:",

    // Team management
    "team.page.title": "Gestão de equipa",
    "team.page.subtitle": "Gerir membros da equipa e atribuir funções",
    "team.members.title": "Membros da equipa",
    "team.members.total": "{count} membros no total",
    "team.members.addButton": "+ Adicionar membro",
    "team.add.title": "Adicionar novo membro da equipa",
    "team.add.fullName": "Nome completo *",
    "team.add.email": "Endereço de email *",
    "team.add.emailHint": "O membro irá utilizar este email para iniciar sessão",
    "team.add.role": "Função *",
    "team.add.role.member": "Membro da equipa (pode ver e adicionar dispositivos)",
    "team.add.role.admin": "Administrador (acesso total)",
    "team.add.submit": "Adicionar membro da equipa",
    "team.credentials.title": "Credenciais geradas!",
    "team.credentials.subtitle": "Guarde estas credenciais para",
    "team.credentials.username": "Nome de utilizador",
    "team.credentials.password": "Palavra‑passe",
    "team.credentials.copy": "Copiar",
    "team.credentials.usernameCopied": "Nome de utilizador copiado para a área de transferência!",
    "team.credentials.passwordCopied": "Palavra‑passe copiada para a área de transferência!",
    "team.credentials.warning": "⚠️ Guarde estas credenciais. Não poderão ser recuperadas mais tarde.",
    "team.member.role.admin": "Administrador",
    "team.member.role.member": "Membro da equipa",
    "team.member.changeRole": "Alterar função",
    "team.member.edit": "Editar",
    "team.member.delete": "Eliminar",
    "team.member.deleteTitle": "Eliminar membro da equipa",
    "team.member.deleteDescription": "Tem a certeza de que pretende eliminar",
    "team.member.deleteConfirm": "Eliminar",
    "team.member.editTitle": "Editar membro da equipa",
    "team.member.edit.fullName": "Nome completo *",
    "team.member.edit.email": "Endereço de email *",
    "team.member.edit.role": "Função *",
    "team.member.edit.save": "Guardar alterações",
    "team.member.edit.cancel": "Cancelar",
    "team.noPermission": "Não tem permissão para aceder a esta página. Apenas administradores podem gerir membros da equipa.",

    // Subscription
    "subscription.title": "Gestão de Subscrição",
    "subscription.subtitle": "Gerir a sua subscrição, renovar ou atualizar o seu plano",
    "subscription.freePlan": "Plano Gratuito",
    "subscription.freePlanDays": "Plano Gratuito - {days} Dias",
    "subscription.freeTrialMessage": "Está atualmente num período de teste GRATUITO. O seu período de teste termina em",
    "subscription.afterTrial": "Após o término do período de teste, terá de subscrever para continuar a aceder ao seu painel de administração. Todos os seus dados estarão seguros.",
    "subscription.paymentPending": "Pagamento Pendente de Aprovação",
    "subscription.paymentPendingMessage": "O seu pagamento foi submetido e está pendente de aprovação do administrador.",
    "subscription.paymentPendingInfo": "O seu painel de administração será ativado no prazo de 15 minutos após a aprovação do administrador. Receberá um email de confirmação assim que for ativado.",
    "subscription.notStarted": "Subscrição Ainda Não Iniciada",
    "subscription.notStartedMessage": "A sua subscrição começará em",
    "subscription.notStartedInfo": "A sua subscrição está agendada para começar após o término do seu período de teste gratuito.",
    "subscription.expired": "Subscrição Expirada",
    "subscription.expiredMessage": "A sua subscrição expirou. Para continuar a aceder ao painel de administração, renove a sua subscrição selecionando um plano abaixo.",
    "subscription.expiredInfo": "Os seus dados estão seguros e estarão disponíveis assim que renovar a sua subscrição.",
    "subscription.current": "Subscrição Atual",
    "subscription.startDate": "Data de Início",
    "subscription.endDate": "Data de Fim",
    "subscription.plan": "Plano",
    "subscription.price": "Preço",
    "subscription.renewSamePlan": "Renovar Mesmo Plano",
    "subscription.upgradeOrChange": "Atualizar ou Alterar Plano",
    "subscription.choosePlan": "Escolha o Seu Plano",
    "subscription.mostPopular": "Mais Popular",
    "subscription.monthSubscription": "subscrição de 1 mês",
    "subscription.threeMonthSubscription": "subscrição de 3 meses",
    "subscription.sixMonthSubscription": "subscrição de 6 meses",
    "subscription.twelveMonthSubscription": "subscrição de 12 meses",
    "subscription.renewPlan": "Renovar Plano",
    "subscription.subscribe": "Subscrever",
    "subscription.processing": "A processar...",
    "subscription.history": "Histórico de Subscrições",
    "subscription.noHistory": "Nenhum histórico de subscrição disponível",
    "subscription.emailNotifications": "Notificações por Email",
    "subscription.emailNotificationMessage": "Receberá uma notificação por email 7 dias antes da sua subscrição expirar. Certifique-se de que o seu endereço de email está atualizado para receber estes lembretes.",
    "subscription.expiringSoon": "Subscrição a Expirar Brevemente",
    "subscription.expiringSoonMessage": "A sua subscrição expirará em {days} dias. Receberá um lembrete por email 7 dias antes da expiração.",
    "subscription.noActive": "Sem Subscrição Ativa",
    "subscription.noActiveMessage": "Subscreva um plano para começar a usar o serviço",
    "subscription.freePlanDaysLeft": "Plano Gratuito - {days} dias restantes",
    "subscription.active": "Ativa",
    "subscription.pending": "Pendente",
    "subscription.expiredStatus": "Subscrição expirada",
    "subscription.expiresIn": "Expira em {days} dias",
    "subscription.paymentDeclined": "Pagamento Recusado",
    "subscription.paymentApproved": "Pagamento Aprovado",
    "subscription.duration": "Duração",
    "subscription.months": "mês(es)",
    "subscription.scheduled": "(Agendado)",
    "subscription.scheduledMessage": "Esta subscrição começará em {date} (o dia após o término do seu período de teste gratuito).",

    // Plan names
    "plan.monthly": "Mensal",
    "plan.starter": "Inicial",
    "plan.professional": "Profissional",
    "plan.enterprise": "Empresarial",
    "plan.threeMonths": "3 Meses",
    "plan.sixMonths": "6 Meses",
    "plan.twelveMonths": "12 Meses",

    // Plan features
    "feature.repairTicketManagement": "Gestão de Bilhetes de Reparação",
    "feature.customerDatabase": "Base de Dados de Clientes",
    "feature.paymentProcessing": "Processamento de Pagamentos",
    "feature.analyticsReports": "Análises e Relatórios",
    "feature.emailSupport": "Suporte por Email",
    "feature.teamManagement": "Gestão de Equipa",
    "feature.everythingIn3Months": "Tudo em 3 Meses",
    "feature.advancedAnalytics": "Análises Avançadas",
    "feature.prioritySupport": "Suporte Prioritário",
    "feature.customReports": "Relatórios Personalizados",
    "feature.apiAccess": "Acesso à API",
    "feature.dataExport": "Exportação de Dados",
    "feature.everythingIn6Months": "Tudo em 6 Meses",
    "feature.unlimitedTickets": "Bilhetes Ilimitados",
    "feature.dedicatedSupport": "Suporte Dedicado",
    "feature.customIntegrations": "Integrações Personalizadas",
    "feature.whiteLabelOptions": "Opções de Marca Branca",
    "feature.advancedSecurity": "Segurança Avançada",

    // Analytics
    "analytics.title": "Análises",
    "analytics.subtitle": "Insights abrangentes sobre o seu negócio de reparação",
    "analytics.totalDevices": "Total de Dispositivos",
    "analytics.allRepairDevices": "Todos os dispositivos de reparação",
    "analytics.totalRevenue": "Receita Total",
    "analytics.fromAllCompleted": "De todas as reparações concluídas",
    "analytics.averagePrice": "Preço Médio",
    "analytics.perDeviceRepair": "Por reparação de dispositivo",
    "analytics.statusDistribution": "Distribuição de Estado",
    "analytics.pending": "Pendente",
    "analytics.inProgress": "Em Curso",
    "analytics.completed": "Concluído",
    "analytics.delivered": "Entregue",
    "analytics.recentDevices": "Dispositivos Recentes",
    "analytics.noDevicesYet": "Ainda não há dispositivos. Crie a sua primeira entrada de dispositivo!",

    // Table headers
    "table.date": "Data",
    "table.customer": "Cliente",
    "table.contact": "Contacto",
    "table.model": "Modelo",
    "table.imei": "IMEI",
    "table.service": "Serviço",
    "table.status": "Estado",
    "table.price": "Preço",
    "table.action": "Ação",
  },
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en")

  useEffect(() => {
    if (typeof window === "undefined") return
    const stored = window.localStorage.getItem("language")
    if (stored === "en" || stored === "pt") {
      setLanguageState(stored)
    }
  }, [])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    if (typeof window !== "undefined") {
      window.localStorage.setItem("language", lang)
    }
  }

  const t = (key: string) => {
    const current = translations[language][key]
    if (current !== undefined) return current
    const fallback = translations.en[key]
    return fallback ?? key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useTranslation() {
  const ctx = useContext(LanguageContext)
  if (!ctx) {
    throw new Error("useTranslation must be used within a LanguageProvider")
  }
  return ctx
}

