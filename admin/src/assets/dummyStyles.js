// src/assets/dummyStyles.js
export const styles = {
  // Common gradient backgrounds
  gradientOrange: "bg-gradient-to-br from-orange-900/30 to-amber-900/30",
  gradientGray: "bg-white border border-gray-200 shadow-sm",
  gradientGrayToGray: "bg-gradient-to-br from-gray-50 to-white border border-gray-200",
  
  // Common borders and transitions
  borderGray: "border border-gray-200",
  borderHoverOrange: "hover:border-orange-500/50 transition-all",
  borderOrange: "border border-orange-800/50",
  
  // Common rounded corners
  rounded2xl: "rounded-2xl",
  roundedXl: "rounded-xl",
  roundedLg: "rounded-lg",
  roundedFull: "rounded-full",
  
  // Common text colors
  textWhite: "text-gray-900",
  textGray: "text-gray-400",
  textGray300: "text-gray-600",
  textOrange: "text-orange-400",
  textRed: "text-red-400",
  
  // Common button styles
  buttonPrimary: "px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 text-white",
  buttonSecondary: "bg-gray-50 border border-gray-200 border border-gray-200 px-5 py-2.5 text-gray-600 rounded-xl",
  
  // Common input styles
  inputField: "bg-white border border-gray-200 w-full px-4 py-2.5 text-gray-900 rounded-lg",
  
  // Component-specific styles
  statCard: "p-5 w-full max-w-xs",
  carCard: "overflow-hidden duration-300",
  carImage: "w-full h-48 object-cover",
  statusBadge: "px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full",
  modalOverlay: "fixed inset-0 bg-white/95 backdrop-blur-sm flex items-center justify-center p-4 z-50",
  modalContainer: "shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto",
  noCarsContainer: "text-center py-16 rounded-2xl border border-gray-200 mt-8",
  filterSelect: "p-5 w-full max-w-xs"
};


// src/assets/dummyStyles.js
export const bookStyles = {
  // Common gradient backgrounds
  gradientOrange: "bg-gradient-to-br from-orange-900/30 to-amber-900/30",
  gradientGray: "bg-white border border-gray-200 shadow-sm",
  gradientGrayToGray: "bg-gradient-to-br from-gray-50 to-white border border-gray-200",
  gradientGrayToGrayLight: "bg-gray-50 border border-gray-200",
  gradientOrangeToAmber: "bg-gradient-to-br from-orange-800/50 to-amber-800/50",
  gradientOrangeToAmberSolid: "bg-gradient-to-br from-orange-700 to-amber-700",
  
  // Common borders and transitions
  borderGray: "border border-gray-200",
  borderHoverOrange: "hover:border-orange-500/50 transition-all",
  borderOrange: "border border-orange-800/30",
  borderOrangeLight: "border border-orange-800/50",
  
  // Common rounded corners
  rounded2xl: "rounded-2xl",
  roundedXl: "rounded-xl",
  roundedLg: "rounded-lg",
  roundedFull: "rounded-full",
  
  // Common text colors
  textWhite: "text-gray-900",
  textGray: "text-gray-400",
  textGray300: "text-gray-600",
  textOrange: "text-orange-400",
  textRed: "text-red-400",
  textGreen: "text-green-400",
  textAmber: "text-amber-400",
  
  // Common button styles
  buttonPrimary: "px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 text-white",
  buttonSecondary: "bg-gray-50 border border-gray-200 border border-gray-200 px-5 py-2.5 text-gray-600 rounded-xl",
  buttonSuccess: "bg-gradient-to-r from-green-700/50 to-green-800/50 text-green-300 hover:text-white transition-colors text-sm px-3 py-1 rounded-lg",
  buttonCancel: "bg-gradient-to-r from-gray-800/50 to-gray-900/50 text-gray-400 hover:text-gray-700 text-sm px-3 py-1 rounded-lg",
  buttonEdit: "bg-gradient-to-r from-orange-700/50 to-amber-700/50 text-orange-300 hover:text-white text-sm px-3 py-1 rounded-lg",
  
  // Common input styles
  inputField: "bg-white border border-gray-200 w-full px-4 py-2.5 text-gray-900 rounded-lg",
  inputFieldWithIcon: "bg-gray-50 border border-gray-200 border border-gray-200 w-full px-4 py-2.5 pl-10 text-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500",
  
  // Status styles
  statusCompleted: "bg-green-900/20 text-green-400",
  statusPending: "bg-amber-900/20 text-amber-400",
  statusActive: "bg-orange-900/20 text-orange-400",
  statusCancelled: "bg-red-900/20 text-red-400",
  statusDefault: "bg-gray-50 text-gray-400",
  
  // Component-specific styles
  statCard: "p-5 w-full max-w-xs",
  carCard: "overflow-hidden duration-300",
  carImage: "w-full h-48 object-cover",
  statusBadge: "px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full",
  modalOverlay: "fixed inset-0 bg-white/95 backdrop-blur-sm flex items-center justify-center p-4 z-50",
  modalContainer: "shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto",
  noItemsContainer: "text-center py-16 rounded-2xl border border-gray-200",
  filterSelect: "p-5 w-full max-w-xs",
  panel: "bg-white border border-gray-200 shadow-sm backdrop-blur-sm rounded-xl p-4",
  specItem: "flex flex-col items-center p-3 rounded-xl border border-gray-200 hover:border-orange-500/50 transition-all",
  detailItem: "flex items-start",
  bookingCard: "backdrop-blur-sm rounded-2xl overflow-hidden border border-gray-200 hover:border-orange-500/50 transition-all duration-300",
  searchFilterBar: "backdrop-blur-sm rounded-2xl p-5 mb-6 border border-gray-200"
};


// src/assets/dummyStyles.js
export const AddCarPageStyles = {
  // Page background and layout
  pageContainer: "min-h-screen p-4 sm:p-6",
  fixedBackground: "fixed inset-0 overflow-hidden pointer-events-none",
  gradientBlob1: "absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-gradient-to-r from-orange-600 to-orange-800 blur-3xl opacity-10",
  gradientBlob2: "absolute bottom-1/3 right-1/4 w-56 h-56 rounded-full bg-gradient-to-r from-amber-600 to-amber-800 blur-3xl opacity-10",
  gradientBlob3: "absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 rotate-45 bg-gradient-to-r from-orange-500 to-amber-500 blur-xl opacity-10",

  // Header
  headerContainer: "relative mb-8 pt-20 text-center",
  headerDivider: "absolute inset-x-0 top-0 flex justify-center",
  headerDividerLine: "h-1 w-20 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full",
  title: "text-4xl font-extrabold py-4 text-gray-900 sm:text-5xl mb-3 tracking-wide",
  titleGradient: "text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-400",
  subtitle: "text-lg text-gray-400 max-w-2xl mx-auto",

  // Form
  formContainer: "max-w-4xl mx-auto",
  form: "glass-card rounded-2xl shadow-xl p-6 sm:p-10 relative overflow-hidden border border-gray-200",
  formGrid: "grid grid-cols-1 lg:grid-cols-2 gap-8",
  formColumn: "space-y-6",
  formGridInner: "grid grid-cols-1 sm:grid-cols-2 gap-4",

  // Inputs and labels
  label: "block text-sm font-medium text-gray-600 mb-2",
  labelWithIcon: "block text-sm font-medium text-gray-600 mb-2 flex items-center",
  input: "glass-input w-full px-4 py-3 rounded-xl text-gray-700 shadow-sm focus:ring-2 focus:ring-orange-500 transition-all",
  inputWithPrefix: "glass-input w-full pl-8 pr-4 py-3 rounded-xl text-gray-700 shadow-sm focus:ring-2 focus:ring-orange-500 transition-all",
  select: "bg-gray-50 border border-gray-200 border border-gray-200 w-full px-4 py-3 rounded-xl text-gray-700 focus:ring-2 focus:ring-orange-500",
  textarea: "glass-input w-full px-4 py-3 rounded-xl text-gray-700 shadow-sm focus:ring-2 focus:ring-orange-500 transition-all",

  // Radio buttons
  radioContainer: "flex space-x-4",
  radioLabel: (isSelected) => 
    `flex-1 flex items-center justify-center p-3 rounded-xl cursor-pointer transition-all hover:shadow-md ${
      isSelected
        ? "bg-gradient-to-r from-orange-700/30 to-amber-700/30 border border-orange-500/50"
        : "glass-input"
    }`,
  radioInput: "h-4 w-4 text-orange-500 focus:ring-orange-500",
  radioText: "ml-2 text-gray-600",

  // Image upload
  imageUploadContainer: "flex items-center justify-center w-full",
  imageUploadLabel: "flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer glass-input shadow-sm hover:bg-gray-50 transition-all",
  imageUploadPlaceholder: "flex flex-col items-center justify-center pt-5 pb-6",
  imageUploadIcon: "w-10 h-10 mb-3 text-gray-500",
  imageUploadText: "text-sm text-gray-400 text-center",
  imageUploadTextSemibold: "font-semibold",
  imageUploadSubText: "text-xs text-gray-500 mt-1",

  // Button
  submitButton: "px-10 py-4 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-orange-500 focus:ring-opacity-50 text-lg bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500",
  buttonText: "drop-shadow-md",

  // Icons
  iconSmall: "w-5 h-5 mr-2 text-orange-500",
  iconMedium: "w-6 h-6 mr-2 text-red-400",
  iconLarge: "w-8 h-8 mr-3 text-orange-400",
  iconInline: "w-5 h-5 ml-2 inline",
  iconUpload: "w-10 h-10 mb-3 text-gray-500",
};

// Success and error toast styles
export const toastStyles = {
  success: {
    container: "bg-gradient-to-r from-gray-50 to-white border border-gray-200 border-l-4 border-orange-500",
    body: "font-sans text-gray-800",
  },
  error: {
    container: "bg-gradient-to-r from-gray-50 to-white border border-gray-200",
    body: "font-sans text-gray-800",
  },
};


// Add to src/assets/dummyStyles.js
export const BookingPageStyles = {
  // Page background and layout
  pageContainer: "min-h-screen p-4 sm:p-6",
  fixedBackground: "fixed inset-0 overflow-hidden pointer-events-none",
  gradientBlob1: "absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-gradient-to-r from-orange-600 to-orange-800 blur-3xl opacity-10",
  gradientBlob2: "absolute bottom-1/3 right-1/4 w-56 h-56 rounded-full bg-gradient-to-r from-amber-600 to-amber-800 blur-3xl opacity-10",
  gradientBlob3: "absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 rotate-45 bg-gradient-to-r from-orange-500 to-amber-500 blur-xl opacity-10",

  // Header
  headerContainer: "relative mb-8 pt-16 text-center",
  headerDivider: "absolute inset-x-0 top-0 flex justify-center",
  headerDividerLine: "h-1 w-20 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full",
  title: "text-4xl font-extrabold py-4 text-gray-900 sm:text-5xl mb-3 tracking-wide",
  titleGradient: "text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-400",
  subtitle: "text-gray-400 max-w-2xl mx-auto",

  // Search and Filter
  searchFilterContainer: "bg-white border border-gray-200 shadow-sm backdrop-blur-sm rounded-2xl p-5 mb-6",
  searchFilterGrid: "grid grid-cols-1 md:grid-cols-3 gap-4",
  filterLabel: "block text-sm font-medium text-gray-400 mb-2",
  filterInput: "bg-gray-50 border border-gray-200 border border-gray-200 w-full px-4 py-2.5 pl-10 text-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500",
  filterIconContainer: "absolute left-3 top-3 text-orange-500",
  totalBookingsContainer: "bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg p-4 border border-orange-400/30 flex items-center justify-center shadow-md",
  totalBookingsLabel: "text-orange-50 text-sm mb-1",
  totalBookingsValue: "text-2xl font-bold text-white",

  // Booking Card
  bookingCard: "bg-white border border-gray-200 shadow-sm backdrop-blur-sm rounded-2xl overflow-hidden border border-gray-200 hover:border-orange-500/50 transition-all duration-300",
  bookingCardHighlight: "ring-2 ring-emerald-400/70 bg-emerald-900/20 animate-pulse",
  bookingCardHeader: "flex items-center mb-4 md:mb-0",
  bookingIconContainer: "bg-gradient-to-br from-orange-800/50 to-amber-800/50 p-3 rounded-xl mr-4",
  bookingIcon: "text-orange-400 text-xl",
  bookingCustomer: "text-lg font-bold text-gray-900",
  bookingEmail: "text-sm text-gray-400",
  bookingExpandIcon: "flex items-center text-orange-400 ml-auto md:hidden",
  bookingInfoGrid: "grid grid-cols-2 sm:grid-cols-4 gap-4",
  bookingInfoLabel: "text-xs text-gray-400",
  bookingInfoValue: "text-sm font-medium text-gray-900",
  bookingAmount: "text-sm font-semibold text-orange-400",
  bookingActions: "flex flex-wrap justify-between items-center gap-3 mt-4",
  bookingActionButton: (color) => {
    const styles = {
      green: "rounded-lg bg-green-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-700 transition-colors",
      gray: "rounded-lg bg-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-300 transition-colors",
      orange: "rounded-lg bg-orange-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-orange-700 transition-colors",
      red: "rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors",
    };
    return styles[color] || styles.gray;
  },
  bookingEditButton: "rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-sm font-semibold text-orange-700 hover:bg-orange-600 hover:text-white transition-colors flex items-center",
  bookingDetails: "border-t border-gray-200 p-5 bg-gray-50 border border-gray-200",
  bookingDetailsGrid: "grid grid-cols-1 md:grid-cols-2 gap-6",

  // Panel
  panel: "bg-white border border-gray-200 shadow-sm backdrop-blur-sm rounded-xl p-4",
  panelTitle: "text-md font-bold text-gray-900 mb-4 flex items-center",
  panelIcon: "mr-2 text-orange-400",

  // Detail
  detailContainer: "flex items-start",
  detailIcon: "text-orange-400 mt-1 mr-3",
  detailLabel: "text-xs text-gray-400",
  detailValue: "text-sm font-medium text-gray-900",

  // Spec
  specContainer: "flex flex-col items-center bg-gray-50 border border-gray-200 p-3 rounded-xl hover:border-orange-500/50 transition-all",
  specIcon: "text-xl mb-2 text-orange-400",
  specLabel: "text-xs text-gray-400",
  specValue: "font-semibold text-sm text-gray-900",

  // Status
  statusIndicator: (status) => {
    const config = {
      completed: "bg-green-100 text-green-700 border border-green-200",
      pending: "bg-amber-100 text-amber-800 border border-amber-200",
      upcoming: "bg-blue-100 text-blue-700 border border-blue-200",
      active: "bg-orange-100 text-orange-700 border border-orange-200",
      cancelled: "bg-red-100 text-red-700 border border-red-200",
      default: "bg-gray-100 text-gray-600 border border-gray-200",
    };
    return `inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${config[status] || config.default}`;
  },
  statusIcon: (status) => {
    const config = {
      completed: "bg-green-500",
      pending: "bg-amber-500",
      active: "bg-orange-500",
      cancelled: "bg-red-500",
      default: "bg-gray-500"
    };
    return `w-2 h-2 rounded-full mr-2 ${config[status] || config.default}`;
  },

  // No Bookings
  noBookingsContainer: "bg-white border border-gray-200 shadow-sm backdrop-blur-sm text-center py-16 rounded-2xl",
  noBookingsIconContainer: "mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-orange-900/30 to-amber-900/30 flex items-center justify-center mb-6",
  noBookingsIcon: "bg-gradient-to-br from-orange-700 to-amber-700 w-16 h-16 rounded-full flex items-center justify-center",
  noBookingsIconSvg: "h-8 w-8 text-orange-300",
  noBookingsTitle: "mt-4 text-xl font-medium text-gray-900",
  noBookingsText: "mt-2 text-gray-400",
  noBookingsButton: "mt-4 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 text-white flex items-center mx-auto",

  // Car Image
  carImageContainer: "bg-gradient-to-br from-orange-900/30 to-amber-900/30 rounded-xl w-20 h-12 flex items-center justify-center",
};

export const statusConfig = {
  completed: { bg: "bg-green-100", text: "text-green-700" },
  pending: { bg: "bg-amber-100", text: "text-amber-800" },
  upcoming: { bg: "bg-blue-100", text: "text-blue-700" },
  active: { bg: "bg-orange-100", text: "text-orange-700" },
  cancelled: { bg: "bg-red-100", text: "text-red-700" },
  default: { bg: "bg-gray-100", text: "text-gray-600" },
};

// src/assets/dummyStyles.js (add these styles to the existing file)
export const navbarStyles = {
  // Navbar container
  navbar: (scrolled) => `fixed w-full top-0 z-50 transition-all duration-300 ${scrolled ? "py-3" : "py-5"}`,
  
  // Navbar inner container
  navbarInner: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",
  navbarCenter: "flex justify-center",
  
  // Navbar background
  navbarBackground: (scrolled) => `bg-white/95 backdrop-blur-lg border border-gray-200 shadow-lg w-full rounded-full transition-all duration-300 ${scrolled ? "py-2 px-6" : "py-3 px-8"}`,
  
  // Content container
  contentContainer: "flex justify-between items-center h-full",
  
  // Logo
  logoLink: "flex items-center",
  logoContainer: "flex flex-col items-center text-xl md:text-2xl lg:text-2xl leading-none",
  logoImage: "h-[1em] w-auto block",
  logoText: "font-bold tracking-wider font-[pacifico] text-gray-900 mt-1",
  
  // Desktop navigation
  desktopNav: "hidden lg:flex items-center",
  navLinksContainer: "flex space-x-1 mx-6",
  navLinkInactive:
    "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full text-gray-700 hover:text-orange-600 hover:bg-orange-50/90 transition-colors duration-300",
  navLinkActive:
    "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full text-white bg-orange-500 shadow-md shadow-orange-500/25 transition-colors duration-300",
  navDivider: "h-5 w-px bg-gray-300 my-auto",
  
  // Mobile menu button
  mobileMenuButton: "lg:hidden flex items-center",
  menuButton: "text-gray-700 hover:text-blue-600 focus:outline-none",
  
  // Mobile menu
  mobileMenu: "lg:hidden bg-white border-t border-gray-200 shadow-lg mt-1",
  mobileMenuContainer: "px-4 pt-2 pb-8 space-y-1",
  mobileNavLink:
    "block px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-3",
  mobileNavLinkActive:
    "block px-4 py-3 rounded-lg bg-orange-50 text-orange-700 border border-orange-200 font-medium transition-colors flex items-center gap-3",
};