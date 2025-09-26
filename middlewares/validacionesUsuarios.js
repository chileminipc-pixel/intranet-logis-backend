const { body } = require('express-validator');

const validarUsuario = [
  body('email')
    .notEmpty().withMessage('El email es obligatorio')
    .isEmail().withMessage('El formato del email no es válido'),

  body('password')
    .notEmpty().withMessage('La contraseña es obligatoria')
    .isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),

  body('cliente_id')
    .notEmpty().withMessage('El cliente_id es obligatorio'),

  body('rol')
    .notEmpty().withMessage('El rol es obligatorio')
    .isIn(['admin', 'cliente']).withMessage('El rol debe ser "admin" o "cliente"')
];

const validarActualizacionUsuario = [
  body('email')
    .optional()
    .notEmpty().withMessage('El email no puede estar vacío')
    .isEmail().withMessage('El formato del email no es válido'),

  body('cliente_id')
    .optional()
    .notEmpty().withMessage('El cliente_id no puede estar vacío'),

  body('rol')
    .optional()
    .notEmpty().withMessage('El rol no puede estar vacío')
    .isIn(['admin', 'cliente']).withMessage('El rol debe ser "admin" o "cliente"'),

  body('password')
    .optional()
    .notEmpty().withMessage('La contraseña no puede estar vacía')
    .isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres')
];

module.exports = {
  validarUsuario,
  validarActualizacionUsuario
};