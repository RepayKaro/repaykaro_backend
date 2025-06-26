module.exports = (moduleName, action) => {
  return async (req, res, next) => {
    const user = req.user; // Assumes user is attached via auth middleware

    if (!user) {
      return res.status(401).json({ message: "Unauthorized" , success: false,isAuthorized:false});
    }
    if (!user.permissions) {
      return res.status(401).json({ message: "Forbidden: No permission Initial", success: false ,isAuthorized:false});
    }

    const permission = user.permissions.find(
      (p) => p.module === moduleName && p.actions.includes(action)
    );

    if (!permission) {
      return res.status(403).json({ message: "Forbidden: No permission", success: false,isAuthorized:false });
    }

    next();
  };
};